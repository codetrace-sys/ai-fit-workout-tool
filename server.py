"""
健身计划 AI 后端服务
用法：
    pip install flask flask-cors volcengine-python-sdk
    set ARK_API_KEY=你的API_KEY
    python server.py
然后访问 http://127.0.0.1:5000
"""

import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from volcenginesdkarkruntime import Ark

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

API_KEY = os.getenv("ARK_API_KEY")
MODEL = "doubao-seed-evolving"

if not API_KEY:
    raise RuntimeError("请设置环境变量 ARK_API_KEY")

client = Ark(
    base_url="https://ark.cn-beijing.volces.com/api/v3",
    api_key=API_KEY,
)

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plans.json")

# 取数据
def _load_all():
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

# 存数据
def _save_all(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# 生成提示词
def build_prompt(user):
    return f"""你是一个专业的健身教练，请根据以下用户信息生成一周的健身计划：
身高: {user['height']}cm，体重: {user['weight']}kg，年龄: {user['age']}，健身目标: {user['target']}，每周训练天数: {user['days']}，训练经验: {user['exp']}，可用器械: {user['tool']}

请严格按照以下 JSON 格式返回结果，不要返回任何多余文字：
{{
  "weekRange": "2026-09-07 ~ 2026-09-13",
  "plan": {{
    "周一": {{
      "type": "训练日",
      "focus": "胸+三头",
      "exercises": [
        {{ "name": "杠铃卧推", "sets": 4, "reps": "8-12", "rest": "60s", "note": "" }}
      ]
    }},
    "周二": {{ "type": "休息日", "focus": "", "exercises": [] }},
    "周三": {{ "type": "训练日", "focus": "背+二头", "exercises": [] }},
    "周四": {{ "type": "休息日", "focus": "", "exercises": [] }},
    "周五": {{ "type": "训练日", "focus": "腿+肩", "exercises": [] }},
    "周六": {{ "type": "训练日", "focus": "全身/有氧", "exercises": [] }},
    "周日": {{ "type": "休息日", "focus": "", "exercises": [] }}
  }}
}}

要求：
1. 训练日总数必须等于用户输入的每周训练天数
2. 休息日的 exercises 必须是空数组
3. 每个动作包含 name(动作名称)、sets(组数)、reps(次数范围)、rest(组间休息)、note(备注，可为空)
4. 根据健身目标合理安排训练部位和动作选择
5. 直接返回 JSON，不要用 markdown 代码块包裹，不要加任何解释"""


# ======= AI 生成：后端组 prompt =======
@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.get_json() or {}
    required = ["height", "weight", "age", "target", "days", "exp", "tool"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"缺少字段: {', '.join(missing)}"}), 400

    prompt = build_prompt(data)

    try:
        resp = client.responses.create(
            model=MODEL,
            input=prompt,
        )
        content_parts = []
        for item in resp.output:
            if item.type == "message":
                for c in item.content:
                    if c.type == "output_text":
                        content_parts.append(c.text)
        content = "".join(content_parts)
        return jsonify({"content": content})
    except Exception as e:
        return jsonify({"error": f"AI 接口请求失败: {str(e)}"}), 500


# ======= 历史计划 CRUD（基于本地 JSON 文件）=======
@app.route("/api/plans", methods=["GET"])
def list_plans():
    all_data = _load_all()
    keys = sorted(all_data.keys(), reverse=True)
    summaries = []
    for k in keys:
        plan = all_data[k].get("plan", {})
        training_count = sum(1 for d in plan.values() if d.get("type") == "训练日")
        summaries.append({
            "key": k,
            "weekRange": all_data[k].get("weekRange", k),
            "trainingDays": training_count,
            "restDays": 7 - training_count,
            "savedAt": all_data[k].get("savedAt", ""),
        })
    return jsonify({"items": summaries})


@app.route("/api/plans/<path:key>", methods=["GET"])
def get_plan(key):
    all_data = _load_all()
    if key not in all_data:
        return jsonify({"error": "计划不存在"}), 404
    return jsonify(all_data[key])


@app.route("/api/plans", methods=["POST"])
def save_plan():
    data = request.get_json()
    week_range = data.get("weekRange")
    if not week_range:
        return jsonify({"error": "缺少 weekRange"}), 400

    all_data = _load_all()
    data["savedAt"] = all_data.get(week_range, {}).get("savedAt") or ""
    import datetime
    data["savedAt"] = data["savedAt"] or datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    all_data[week_range] = data
    _save_all(all_data)
    return jsonify({"ok": True, "key": week_range})


@app.route("/api/plans/<path:key>", methods=["DELETE"])
def delete_plan(key):
    all_data = _load_all()
    if key not in all_data:
        return jsonify({"error": "计划不存在"}), 404
    del all_data[key]
    _save_all(all_data)
    return jsonify({"ok": True})


@app.route("/api/plans", methods=["DELETE"])
def clear_plans():
    _save_all({})
    return jsonify({"ok": True})


# ======= 静态页面 =======
@app.route("/")
def index():
    return send_from_directory('.', 'main.html')


if __name__ == "__main__":
    print("=" * 50)
    print("  健身计划 AI 后端已启动")
    print("  服务地址: http://127.0.0.1:5000")
    print(f"  数据文件: {DATA_FILE}")
    print("=" * 50)
    app.run(debug=True, port=5000)