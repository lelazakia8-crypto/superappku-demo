"""SuperAppKu Demo: Flask UI only. No database or credentials required."""
from flask import Flask, render_template, jsonify

app = Flask(__name__)

@app.get('/')
def home():
    return render_template('index.html')

@app.get('/api/health')
def health():
    return jsonify(status='ok', mode='demo', database=False)

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
