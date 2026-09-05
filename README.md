# AI 健身计划生成器

基于火山引擎方舟（豆包大模型）的健身计划生成工具，后端 Flask + 前端原生 HTML/CSS/JS，所有历史计划存储在本地 `plans.json` 文件中。

## 目录结构

```
健身计划生成器/
├── server.py              # Flask 后端，AI 调用 + 历史计划 CRUD
├── requirements.txt       # Python 依赖
├── plans.json             # 历史计划数据（首次运行自动创建）
│
├── main.html              # 生成计划页面
├── main.js                # 生成页脚本（表单、渲染、API 调用）
│
├── history.html           # 历史计划页面
├── history.js             # 历史页脚本（列表、详情、删除）
│
├── base.css               # 基础样式
└── common.css             # 通用样式（表单、按钮、表格、历史列表）
```

## 快速开始

```bash
# 1. 克隆项目后进入目录
cd 健身计划生成器

# 2. 创建虚拟环境（可选，推荐）
python -m venv venv
# Windows cmd:
venv\Scripts\activate
# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置 AI 模型 API Key（二选一）

# 方式 A：环境变量（推荐）
# Windows cmd:
set ARK_API_KEY=你的真实key
# Windows PowerShell:
$env:ARK_API_KEY = "你的真实key"
# Mac/Linux:
export ARK_API_KEY=你的真实key

# 方式 B：永久环境变量
# Win+S 搜索"环境变量" → 新建用户变量 ARK_API_KEY

# 5. 启动后端
python server.py

# 6. 浏览器访问
http://127.0.0.1:5000
```

## 配置说明

| 配置项 | 位置 | 说明 |
|---|---|---|
| `ARK_API_KEY` | 环境变量 | 火山引擎方舟平台的 API Key，必填。没有配置后端会启动报错退出 |
| `MODEL` | `server.py` 第 20 行 | AI 模型名称，默认 `doubao-seed-evolving`，可改为如 `doubao-seed-2-1-pro` |
| `DATA_FILE` | `server.py` 第 30 行 | 历史计划 JSON 文件路径，默认和 `server.py` 同目录 |

## API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/generate` | 提交表单数据，后端组装 prompt 调用 AI，返回 JSON 计划文本 |
| GET | `/api/plans` | 获取历史计划摘要列表 |
| GET | `/api/plans/<key>` | 获取某份计划完整详情 |
| POST | `/api/plans` | 保存当前计划（body 就是 AI 返回的完整 JSON） |
| DELETE | `/api/plans/<key>` | 删除一份计划 |
| DELETE | `/api/plans` | 清空全部历史计划 |

## 表单范围校验

输入框失焦时会自动校验范围，输入超出范围会显示红色边框和文字提示：

| 字段 | 合法范围 |
|---|---|
| 身高 | 50 ~ 250 cm |
| 体重 | 20 ~ 200 kg |
| 年龄 | 5 ~ 120 |
| 每周训练天数 | 1 ~ 6 |

## 数据流

```
用户填写表单 → 失焦校验范围 → 点生成
    → 前端 POST /api/generate {身高,体重,年龄...}
    → 后端组装 prompt → 调火山引擎 AI → 返回 JSON 文本
    → 前端 parse JSON → 渲染表格
    → 点保存 → POST /api/plans → 写入 plans.json
    → 历史页 GET /api/plans → 读取 plans.json
```