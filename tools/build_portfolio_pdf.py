from pathlib import Path
from shutil import copyfile

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
OUTPUT = ROOT / 'output' / 'pdf' / 'portfolio.pdf'
PUBLIC_COPY = DOCS / 'portfolio.pdf'
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont('YaHei', r'C:\Windows\Fonts\msyh.ttc', subfontIndex=0))
pdfmetrics.registerFont(TTFont('Hei', r'C:\Windows\Fonts\simhei.ttf'))

W, H = A4
NAVY = HexColor('#22263A')
MUTED = HexColor('#636A80')
PURPLE = HexColor('#6869C9')
GREEN = HexColor('#287956')
PAPER = HexColor('#F6F6FB')
BORDER = HexColor('#E5E5EF')

c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
c.setTitle('AI 产品原型作品集｜尹伊霄')
c.setAuthor('尹伊霄')
c.setSubject('MindMirror、Research Copilot、Tripwise 产品原型与 GitHub 链接')
c.setKeywords('AI 产品, 产品经理, Vibe coding, 用户研究, 作品集')

def paragraph(text, x, top, width, size=10.5, leading=17, color=NAVY, font='YaHei'):
    style = ParagraphStyle('p', fontName=font, fontSize=size, leading=leading,
                           textColor=color, wordWrap='CJK', spaceAfter=0)
    item = Paragraph(text, style)
    _, height = item.wrap(width, 500)
    item.drawOn(c, x, top-height)
    return height

def text(s, x, y, size=10, color=NAVY, font='YaHei'):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawString(x, y, s)

def link(label, url, x, y, size=9.5):
    text(label, x, y, size=size, color=PURPLE)
    width = pdfmetrics.stringWidth(label, 'YaHei', size)
    c.linkURL(url, (x, y-3, x+width, y+size+2), relative=0, thickness=0)

def page_base(number, label):
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(PURPLE)
    c.roundRect(39, H-48, 24, 3, 1.5, fill=1, stroke=0)
    text(label, 73, H-50, 8.5, PURPLE, 'Hei')
    c.setStrokeColor(BORDER)
    c.line(39, 39, W-39, 39)
    text('尹伊霄 · AI 产品原型作品集', 39, 22, 8, MUTED)
    text(f'{number} / 4', W-69, 22, 8, MUTED)

def image_frame(path, x, y, width, height):
    c.setFillColor(HexColor('#FFFFFF'))
    c.setStrokeColor(BORDER)
    c.roundRect(x-4, y-4, width+8, height+8, 9, fill=1, stroke=1)
    c.drawImage(str(path), x, y, width=width, height=height, preserveAspectRatio=True, anchor='c')

def row(label, body, y):
    c.setFillColor(PURPLE)
    c.roundRect(40, y-10, 4, 23, 2, fill=1, stroke=0)
    text(label, 53, y+2, 10, NAVY, 'Hei')
    height = paragraph(body, 137, y+13, 416, 9.6, 14.8, MUTED)
    if height > 48:
        raise ValueError(f'Row too tall: {label}, {height}')

def project_links(repo, demo, y=80):
    text('项目链接', 40, y+15, 9, NAVY, 'Hei')
    link(repo, 'https://' + repo, 40, y-2, 9.2)
    link(demo, 'https://' + demo, 40, y-20, 9.2)

# Cover
page_base(1, 'SELECTED PRODUCT PROTOTYPES')
c.bookmarkPage('cover')
c.addOutlineEntry('作品集总览', 'cover')
text('AI 产品原型作品集', 40, 720, 30, NAVY, 'Hei')
text('尹伊霄', 40, 678, 17, PURPLE, 'Hei')
paragraph('工业设计 → 用户研究 → 产品判断。用 Vibe coding 把产品问题、交互流程与技术实现连接起来。',
          40, 647, 490, 12, 21, MUTED)

cards = [
    ('01', '心境 MindMirror', '八天对话式反思 Agent', '把具体情境、自动想法与 CBT 工具放入连续对话。', PURPLE),
    ('02', '访研搭档 Research Copilot', '可追溯证据的研究工作台', '从研究方案、资料导入走向可编辑洞察与人工复核。', HexColor('#C77C51')),
    ('03', '途序 Tripwise', '旅行规划与行中 Plan B', '表达地点优先级，生成路线，并比较变化后的取舍。', GREEN),
]
for index, (num, title, subtitle, desc, accent) in enumerate(cards):
    y = 492 - index*139
    c.setFillColor(HexColor('#FFFFFF'))
    c.setStrokeColor(BORDER)
    c.roundRect(39, y, W-78, 117, 16, fill=1, stroke=1)
    c.setFillColor(accent)
    c.roundRect(56, y+68, 36, 28, 8, fill=1, stroke=0)
    text(num, 62, y+76, 10, HexColor('#FFFFFF'), 'Hei')
    text(title, 105, y+77, 15, NAVY, 'Hei')
    text(subtitle, 57, y+46, 10.5, accent, 'Hei')
    paragraph(desc, 57, y+36, 465, 10, 16, MUTED)

text('在线作品集与 GitHub', 40, 150, 11, NAVY, 'Hei')
link('https://yyyyskbfxx.github.io/AI-Demo/', 'https://yyyyskbfxx.github.io/AI-Demo/', 40, 126, 10)
link('https://github.com/YYYYskbfxx', 'https://github.com/YYYYskbfxx', 40, 105, 10)
paragraph('项目页面展示原型与源码。心境在线页为静态对话示例；访研搭档的案例材料、途序的地点与变化情境均为模拟。',
          40, 89, 505, 8.5, 13, MUTED)
c.showPage()

# MindMirror
page_base(2, '01 / MINDMIRROR')
c.bookmarkPage('mindmirror')
c.addOutlineEntry('心境 MindMirror', 'mindmirror')
text('心境 MindMirror', 40, 751, 24, NAVY, 'Hei')
paragraph('面向想理解社交媒体使用习惯的年轻人，把八天自我反思流程做成可运行的 Web Agent。',
          40, 731, 515, 11, 18, MUTED)
image_frame(DOCS / 'images/mindmirror/daily-conversation.png', 40, 367, 515, 329)
text('最新版 Node 页面 · 虚构示例输入与实际模型回复', 41, 346, 8.2, MUTED)
row('产品问题', '屏幕时间只能说明用了多久，难以解释一次刷手机行为背后的情绪和自动想法。', 312)
row('核心体验', '第 1 天引导、第 2–7 天每日反思、第 8 天回顾；对话按情境选择 CBT 工具，旅程按日期保存。', 249)
row('Vibe coding', '先定义阶段状态、工具选择与历史记录，再用原生前端、Node.js 和火山方舟 DeepSeek 实现。', 186)
project_links('github.com/YYYYskbfxx/MindMirror-Web-Agent',
              'yyyyskbfxx.github.io/AI-Demo/mindmirror-project.html', 88)
c.showPage()

# Research Copilot
page_base(3, '02 / RESEARCH COPILOT')
c.bookmarkPage('research')
c.addOutlineEntry('访研搭档 Research Copilot', 'research')
text('访研搭档 Research Copilot', 40, 751, 22, NAVY, 'Hei')
paragraph('面向用户研究员和产品经理，把研究设计、主客观资料、证据追溯与人工判断放进同一工作区。',
          40, 731, 515, 11, 18, MUTED)
image_frame(DOCS / 'images/research/analysis-workspace.png', 40, 367, 515, 329)
text('分析工作区 · 参与者、记录与洞察均为模拟案例', 41, 346, 8.2, MUTED)
row('产品问题', '访谈、任务观察和评分分散时，候选洞察容易脱离原始证据，解释与事实也容易混在一起。', 312)
row('核心体验', '输入研究问题 → 导入主观或客观资料 → 定位证据 → 编辑候选洞察 → 研究者确认后形成机会与报告。', 249)
row('Vibe coding', '先设计资料结构与人工复核状态，再实现导入、字段映射、证据链接、对话和可编辑报告。', 186)
project_links('github.com/YYYYskbfxx/Research-Copilot',
              'yyyyskbfxx.github.io/AI-Demo/research-project.html', 88)
c.showPage()

# Tripwise
page_base(4, '03 / TRIPWISE')
c.bookmarkPage('tripwise')
c.addOutlineEntry('途序 Tripwise', 'tripwise')
text('途序 Tripwise', 40, 751, 24, NAVY, 'Hei')
paragraph('面向自由行用户，将收藏地点、旅行偏好和旅途中发生变化后的重新取舍串成一条流程。',
          40, 731, 515, 11, 18, MUTED)
phone_y, phone_h, phone_w = 381, 300, 187.5
image_frame(DOCS / 'images/tripwise/route.png', 99, phone_y, phone_w, phone_h)
image_frame(DOCS / 'images/tripwise/planb.png', 309, phone_y, phone_w, phone_h)
text('路线方案', 161, 363, 8.5, MUTED)
text('Plan B 对比', 371, 363, 8.5, MUTED)
row('产品问题', '收藏地点很多，用户仍需决定什么必须去、如何排得顺路；行中变化又会打乱原计划。', 323)
row('核心体验', '标记必去 / 想去 / 顺路，设置天数与节奏生成路线；变化发生后比较顺延、替换或减少一站。', 260)
row('Vibe coding', '用原生 HTML、CSS、JavaScript 实现地点权重、规则排程和候选调整；用户确认后才应用 Plan B。', 197)
project_links('github.com/YYYYskbfxx/Tripwise',
              'yyyyskbfxx.github.io/AI-Demo/travel-project.html', 88)
text('地点、时间和外部变化为演示数据；路线未经过真实出行验证。', 40, 49, 8, MUTED)
c.showPage()

c.save()
copyfile(OUTPUT, PUBLIC_COPY)
print(OUTPUT)
print(PUBLIC_COPY)
