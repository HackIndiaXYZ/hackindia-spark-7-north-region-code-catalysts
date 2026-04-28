import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, mean_absolute_error, r2_score

DATA_PATH = "../smart_lighting_dataset_2024.csv"

# Define features
NUMERIC_FEATURES = ['ambient_light_lux', 'motion_detected', 'temperature_celsius', 
                    'occupancy_count', 'traffic_density', 'avg_pedestrian_speed', 'prev_hour_energy_usage_kwh']
CATEGORICAL_FEATURES = ['time_of_day', 'weather_condition']

print("Loading dataset...")
df = pd.read_csv(DATA_PATH)

y_reg = df['adjusted_light_intensity']
y_clf = df['lighting_action_class']
X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]

X_train, X_test, y_reg_train, y_reg_test, y_clf_train, y_clf_test = train_test_split(
    X, y_reg, y_clf, test_size=0.2, random_state=42
)

numeric_transformer = StandardScaler()
categorical_transformer = OneHotEncoder(handle_unknown='ignore')

preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, NUMERIC_FEATURES),
        ('cat', categorical_transformer, CATEGORICAL_FEATURES)
    ])

reg_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                               ('regressor', RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1))])

clf_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                               ('classifier', RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1))])

print("Training & Evaluating Classifier...")
clf_pipeline.fit(X_train, y_clf_train)
y_clf_pred = clf_pipeline.predict(X_test)
accuracy = accuracy_score(y_clf_test, y_clf_pred)

print("Training & Evaluating Regressor...")
reg_pipeline.fit(X_train, y_reg_train)
y_reg_pred = reg_pipeline.predict(X_test)
mae = mean_absolute_error(y_reg_test, y_reg_pred)
r2 = r2_score(y_reg_test, y_reg_pred)

print("\n--- MODEL METRICS ---")
print(f"Action Classifier Accuracy: {accuracy * 100:.2f}%")
print(f"Intensity Regressor R2 Score: {r2:.4f}")
print(f"Intensity Regressor Mean Absolute Error: {mae:.2f} % intensity")
