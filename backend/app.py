from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes.auth import auth_bp
from routes.courses import courses_bp
from routes.assignments import assignments_bp
from routes.student import student_bp
from routes.admin import admin_bp
from routes.settings import settings_bp
from routes.files import files_bp

app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS for all routes (important for React Dev server)
# Trigger reload
CORS(app, resources={r"/api/*": {
    "origins": [
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}}, supports_credentials=True)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(courses_bp, url_prefix='/api/courses')
app.register_blueprint(assignments_bp, url_prefix='/api/assignments')
app.register_blueprint(student_bp, url_prefix='/api/student')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(settings_bp, url_prefix='/api')
app.register_blueprint(files_bp, url_prefix='/api/files')

from werkzeug.exceptions import HTTPException

@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return jsonify({
            "message": e.description,
            "error": e.name
        }), e.code
    return jsonify({
        "message": "An internal server error occurred.",
        "error": str(e)
    }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "Levlox Student Portal API"}), 200

if __name__ == '__main__':
    print(f"Starting server on port {Config.PORT} (Debug: {Config.DEBUG})...")
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
