import os
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
import joblib

app = Flask(__name__)
CORS(app)

DATA_PATH = "../smart_lighting_dataset_2024.csv"
MODEL_DIR = "./models"
REGRESSOR_PATH = os.path.join(MODEL_DIR, "intensity_regressor.pkl")
CLASSIFIER_PATH = os.path.join(MODEL_DIR, "action_classifier.pkl")

# Define features
NUMERIC_FEATURES = ['ambient_light_lux', 'motion_detected', 'temperature_celsius', 
                    'occupancy_count', 'traffic_density', 'avg_pedestrian_speed', 'prev_hour_energy_usage_kwh']
CATEGORICAL_FEATURES = ['time_of_day', 'weather_condition']

def train_models():
    print("Loading dataset and training models... This may take a moment.")
    df = pd.read_csv(DATA_PATH)
    
    # Target variables
    y_reg = df['adjusted_light_intensity']
    y_clf = df['lighting_action_class']
    
    # Input features
    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    
    # Preprocessing pipeline
    numeric_transformer = StandardScaler()
    categorical_transformer = OneHotEncoder(handle_unknown='ignore')
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, NUMERIC_FEATURES),
            ('cat', categorical_transformer, CATEGORICAL_FEATURES)
        ])
    
    # Regressor Pipeline
    reg_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                   ('regressor', RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1))])
    
    # Classifier Pipeline
    clf_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                   ('classifier', RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1))])
    
    print("Training Intensity Regressor...")
    reg_pipeline.fit(X, y_reg)
    print("Training Action Classifier...")
    clf_pipeline.fit(X, y_clf)
    
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
        
    joblib.dump(reg_pipeline, REGRESSOR_PATH)
    joblib.dump(clf_pipeline, CLASSIFIER_PATH)
    print("Models trained and saved successfully.")

# Load models on startup
if not os.path.exists(REGRESSOR_PATH) or not os.path.exists(CLASSIFIER_PATH):
    train_models()

reg_model = joblib.load(REGRESSOR_PATH)
clf_model = joblib.load(CLASSIFIER_PATH)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/predict_batch', methods=['POST'])
def predict_batch():
    try:
        data = request.json
        if not data or not isinstance(data, list):
            return jsonify({"error": "Expected a list of light features"}), 400
            
        df = pd.DataFrame(data)
        
        # Ensure all required columns are present, fill missing with defaults
        for col in NUMERIC_FEATURES:
            if col not in df.columns:
                df[col] = 0.0
                
        for col in CATEGORICAL_FEATURES:
            if col not in df.columns:
                df[col] = "Unknown"
        
        # Predict
        predicted_intensity = reg_model.predict(df)
        predicted_action = clf_model.predict(df)
        
        results = []
        for i in range(len(df)):
            results.append({
                "light_id": data[i].get("light_id", f"unknown_{i}"),
                "recommended_intensity": round(float(predicted_intensity[i]), 1),
                "action_class": int(predicted_action[i])
            })
            
        return jsonify({"success": True, "predictions": results})
        
    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
