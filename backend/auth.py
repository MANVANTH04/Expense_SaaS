from flask import Blueprint, request, jsonify
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
import os

auth_bp = Blueprint("auth", __name__)
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

@auth_bp.route("/auth/google", methods=["POST"])
def google_auth():
    token = request.json.get("token")
    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            token, grequests.Request(), GOOGLE_CLIENT_ID
        )
        userid = idinfo["sub"]
        email = idinfo["email"]
        name = idinfo.get("name", "User")

        # Example: Save/fetch user from DB
        user = {"id": userid, "email": email, "name": name}

        return jsonify({"message": "Google login successful", "user": user})
    except Exception as e:
        print("Google Auth Error:", e)
        return jsonify({"error": "Invalid token"}), 400