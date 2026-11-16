from __future__ import annotations

import os

from flask import Flask, jsonify, request

from blackout_csp.bridge import solve_request

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = os.environ.get("CORS_ORIGIN", "*")
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})

@app.post("/api/solve")
def solve():
    body = request.get_json(silent=True)
    try:
        return jsonify(solve_request(body))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "8000")), debug=False)
