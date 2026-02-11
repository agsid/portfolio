import subprocess
import os
import re
from flask import Flask, render_template, request, jsonify, redirect, url_for

app = Flask(__name__)

PROCESS_NAMES_TO_CHECK = [
    "firefox", "gedit", "thunar", "spotify", "thunderbird", "code", "mousepad",
    "gnome-control-center",
    "xterm"
]

def _run_command(command: str) -> str:
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        app.logger.error(f"Command failed: {command}\nStderr: {e.stderr.strip()}")
        return f"Error: {e.stderr.strip()}"
    except FileNotFoundError:
        app.logger.error(f"Command not found: {command.split()[0]}. Ensure required tools are installed.")
        return "Error: Command not found. Please ensure required tools are installed (e.g., upower, pgrep, nmcli, xrandr, alsa-utils)."

@app.route('/')
def home():
    return redirect(url_for('index'))

@app.route('/index')
def index():
    return render_template('index.html')

@app.route('/editor_mode')
def editor_mode():
    return render_template('editor_mode.html')

@app.route('/logout')
def logout():
    return redirect(url_for('index'))

@app.route('/open-app/<app_name>', methods=['GET'])
def open_app(app_name: str):
    command = f"nohup {app_name} > /dev/null 2>&1 &"
    result = _run_command(command)
    if "Error" in result:
        return jsonify({"status": "error", "message": f"Failed to launch {app_name}: {result}"}), 500
    return jsonify({"status": "success", "message": f"{app_name} launched successfully (or already running)."}), 200

@app.route('/bring-to-front/<app_id>', methods=['POST'])
def bring_to_front(app_id: str):
    command = f"wmctrl -a {app_id}"
    result = _run_command(command)
    if "Error" in result:
        return jsonify({"status": "error", "message": f"Could not bring {app_id} to front: {result}"}), 500
    return jsonify({"status": "success", "message": f"{app_id} brought to front."}), 200

@app.route('/api/terminate-app', methods=['POST'])
def terminate_app():
    app_name = request.json.get('app_name')
    if not app_name:
        return jsonify({"status": "error", "message": "App name not provided"}), 400

    command = f"pkill {app_name}"
    result = _run_command(command)

    if "Error" in result:
        if "no process found" in result.lower() or "no such process" in result.lower():
            return jsonify({"status": "success", "message": f"{app_name} was not running or already terminated."}), 200
        return jsonify({"status": "error", "message": f"Failed to terminate {app_name}: {result}"}), 500
    return jsonify({"status": "success", "message": f"{app_name} terminated successfully."}), 200

@app.route('/api/running-apps', methods=['GET'])
def get_running_apps():
    running_app_ids = []

    for name in PROCESS_NAMES_TO_CHECK:
        try:
            subprocess.run(f"pgrep -x {name}", shell=True, check=True, capture_output=True)
            if name == "gnome-control-center":
                running_app_ids.append("ubuntu")
            elif name == "xterm":
                htop_check = subprocess.run("pgrep -f 'xterm -e htop'", shell=True, capture_output=True)
                if htop_check.returncode == 0:
                    running_app_ids.append("htop")
            else:
                running_app_ids.append(name)
        except subprocess.CalledProcessError:
            pass

    return jsonify({"running_apps": running_app_ids})

@app.route('/api/battery', methods=['GET'])
def get_battery_status():
    battery_percentage = "N/A"

    output = _run_command("upower -i $(upower -e | grep 'battery') | grep 'percentage:' | awk '{print $2}'")
    if "Error" not in output and output.strip():
        battery_percentage = output.strip()
    else:
        output = _run_command("acpi -b | grep -P -o '[0-9]+(?=%)'")
        if "Error" not in output and output.strip():
            battery_percentage = f"{output.strip()}%"

    return jsonify({"battery_status": battery_percentage})

@app.route('/api/current-connection', methods=['GET'])
def get_current_connection():
    command = "nmcli -t -f active,ssid dev wifi | grep '^yes' | cut -d':' -f2"
    current_ssid = _run_command(command)
    if "Error" in current_ssid or not current_ssid:
        return jsonify({"current_connection": "Not Connected"})
    return jsonify({"current_connection": current_ssid})

@app.route('/api/networks', methods=['GET'])
def get_available_networks():
    command = "nmcli -t -f ssid dev wifi list"
    output = _run_command(command)
    if "Error" in output:
        return jsonify({"networks": []})
    networks = sorted(list(set(line.strip() for line in output.splitlines() if line.strip())))
    return jsonify({"networks": networks})

@app.route('/connect', methods=['POST'])
def connect_to_wifi():
    ssid = request.form.get('ssid')
    password = request.form.get('password')

    if not ssid:
        return redirect(url_for('index', message="Error: SSID is required."))

    if password:
        command = f"nmcli dev wifi connect '{ssid}' password '{password}'"
    else:
        command = f"nmcli dev wifi connect '{ssid}'"

    result = _run_command(command)
    
    if "Error" in result:
        message = f"❌ Failed to connect to {ssid}: {result}"
    elif "successfully activated" in result.lower():
        message = f"✅ Connected to {ssid}"
    else:
        message = f"ℹ️ Connection attempt to {ssid} finished. Status: {result}"

    return redirect(url_for('index', message=message))

@app.route('/api/set-brightness', methods=['POST'])
def set_brightness():
    brightness = request.json.get('brightness')
    if brightness is None:
        return jsonify({"status": "error", "message": "Brightness value not provided"}), 400
    
    try:
        brightness_float = float(brightness) / 100.0
        if not (0.0 <= brightness_float <= 1.0):
            return jsonify({"status": "error", "message": "Brightness must be between 0 and 100"}), 400

        display_output = _run_command("xrandr | grep ' connected primary' | awk '{print $1}'")
        if "Error" in display_output or not display_output:
            return jsonify({"status": "error", "message": f"Could not detect primary display: {display_output}"}), 500
        
        display_name = display_output.strip()
        command = f"xrandr --output {display_name} --brightness {brightness_float:.2f}"
        result = _run_command(command)

        if "Error" in result:
            return jsonify({"status": "error", "message": f"Failed to set brightness: {result}"}), 500
        return jsonify({"status": "success", "message": f"Brightness set to {brightness}% on {display_name}."}), 200
    except ValueError:
        return jsonify({"status": "error", "message": "Invalid brightness value. Must be a number."}), 400
    except Exception as e:
        app.logger.error(f"Unexpected error setting brightness: {e}")
        return jsonify({"status": "error", "message": f"An unexpected error occurred: {e}"}), 500

@app.route('/api/set-volume', methods=['POST'])
def set_volume():
    volume = request.json.get('volume')
    if volume is None:
        return jsonify({"status": "error", "message": "Volume value not provided"}), 400

    try:
        volume_int = int(volume)
        if not (0 <= volume_int <= 100):
            return jsonify({"status": "error", "message": "Volume must be between 0 and 100"}), 400

        command = f"amixer -D pulse sset Master {volume_int}%"
        result = _run_command(command)

        if "Error" in result:
            return jsonify({"status": "error", "message": f"Failed to set volume: {result}"}), 500
        return jsonify({"status": "success", "message": f"Volume set to {volume}%."}), 200
    except ValueError:
        return jsonify({"status": "error", "message": "Invalid volume value. Must be an integer."}), 400
    except Exception as e:
        app.logger.error(f"Unexpected error setting volume: {e}")
        return jsonify({"status": "error", "message": f"An unexpected error occurred: {e}"}), 500

if __name__ == '__main__':
    if not os.path.exists('templates'):
        os.makedirs('templates')
    
    app.run(debug=True, host='0.0.0.0', port=5000)

