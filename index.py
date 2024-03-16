from flask import Flask, request, send_file
import requests
import os

app = Flask(__name__)

API_URL = "https://api.convert3d.org/convert"
TOKEN = "520b37eb-d930-438f-abe4-a280fe042fa5"

@app.route('/', methods=['GET', 'POST'])
def upload_and_convert():
    if request.method == 'POST':
        file = request.files['file']
        filename = file.filename
        file.save(filename)

        try:
            response = requests.post(API_URL,
                                     files={'file': open(filename, 'rb')},
                                     data={'from_format': 'glb', 'to_format': 'usdz'},
                                     headers={'Authorization': f'Token {TOKEN}'})
            if response.status_code == 200:
                usdz_filename = filename.rsplit('.', 1)[0] + '.usdz'
                with open(usdz_filename, 'wb') as f:
                    f.write(response.content)
                return f'<a href="/download/{usdz_filename}">Download USDZ</a>'
            else:
                return f"Conversion failed with status code: {response.status_code}"
        finally:
            os.remove(filename)

    return '''
    <form method="post" enctype="multipart/form-data">
      <input type="file" name="file">
      <input type="submit" value="Convert to USDZ">
    </form>
    '''

@app.route('/download/<path:filename>')
def download_file(filename):
    return send_file(filename, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
