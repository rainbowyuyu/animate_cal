def return_prompt(
        op_desc,
        latex_a,
        latex_b,
        **kwargs
):
    if op_desc == "公式推演":
        return formular_prompt(latex_a, latex_b, **kwargs)
    elif op_desc == "可视化演示":
        return visualization_prompt(latex_a, latex_b, **kwargs)
    elif op_desc == "通用演示":
        return for_vis_prompt(latex_a, latex_b, **kwargs)
    elif op_desc == "完整解题演示":
        return solution_visualization_prompt(latex_a, **kwargs)


def solution_visualization_prompt(problem_text, **kwargs):
    """生成「完整解题过程」的 Manim 演示：题目、各选项极限/结论、答案；可画图题目以画图为主。"""
    return f"""
你是一名 **Manim Community Edition（v0.18+）动画工程专家**。本任务要求根据下方给出的**完整题目与解题分析**，
生成**完整解题方案的可视化演示**：依次展示题目、各选项及其极限（或结论）、最终答案。**能画图的题目以画图为主**（如函数图像、极限趋势），给用户直观的可视化。

---

## 一、任务输入（仅用于理解，不要原样输出）

【完整题目与解题分析】
{problem_text}

---

## 二、硬性技术约束（必须 100% 严格遵守）

1. **导入与类**
   - 必须：`from manim import *`
   - 类名 **必须**：`GenScene`，继承自 `Scene`
   - 所有动画 **只能** 写在 `def construct(self):` 中
   - **防止黑屏**：画面内容必须通过 `self.play(...)` 或 `self.add(...)` 显示。若只创建 mobject 而不 play/add，会渲染出黑屏。至少在第一帧用 `self.play(Write(...))` 或 `self.add(...)` 显示题目或第一个公式。

2. **MathTex 规范**
   - 所有公式/数学文字 **必须** 使用 `MathTex`，且用 `r"..."` 原始字符串
   - **严禁在 MathTex 中出现任何中文字符**。题目、选项说明、结论一律用英文或数学符号表示（如 "Option A", "limit = 0", "Answer: C"）。

3. **布局与排版（严禁一屏挤满、严禁重叠与超出）**
   - **禁止一屏塞满**：同一帧内不得同时展示所有选项和所有图像。必须**分阶段、分屏**展示（参考 Manim Community 的 FadeIn/FadeOut/移出再入的用法）。
   - **选项与图一一对应、动画完整**：题目有几个选项就画几幅图（例如四个选项必须画四幅图，不得只画两幅或遗漏）。每选项单独一屏展示其公式与对应图像。
   - **文字/公式严禁重合**：同一帧内所有文字、公式、标签之间必须留有足够间距，使用 **arrange(DOWN, buff=0.4)**、**next_to(..., buff=0.35)** 等明确错开，不得重叠、遮挡。
   - 使用 **VGroup** 将同一逻辑块（题目或单个选项+其图）包成一组；整体用 **to_edge(UP)** 或 **move_to(ORIGIN)** 等控制在画面内。
   - 所有文字/公式 **必须 scale(0.55～0.75)**，单屏内容少而清晰；可用 **fit_in_frame** 或整体 scale 保证不超出 frame。
   - 禁止文字、公式堆叠或超出可视区域；禁止多选项、多图同时挤在一页。

4. **图像与坐标轴（稳定、不超出屏幕）**
   - 画图时 **必须** 使用 **Axes(x_range=[...], y_range=[...], ...)** 显式指定范围，保证曲线和文字始终在画面内。
   - **y_range 必须有限**：例如 x->0 的极限题用 `y_range=[-0.5, 2.5, 0.5]` 或 `y_range=[0, 2, 0.5]`，禁止不设上限导致曲线冲出屏幕。
   - **x_range**：若函数在 0 处无定义或趋于无穷，用 `x_range=[0.05, 1, 0.2]` 或 `[0.01, 1]` 等避开奇点，避免竖线冲出。
   - 在 **plot** 中：对会趋于无穷的函数，在 lambda 内对超出合理范围的值 **return float("nan")**，这样 Manim 不会画出界；或只画有界区间。
   - **每阶段至多 1 个选项配 1 个图**（或仅公式），避免一屏多图拥挤；下一阶段再用 FadeOut 清空或移出后展示下一项。

5. **输出限制**
   - 只输出纯 Python 代码，不要 Markdown、不要解释。背景使用默认黑色。

---

## 三、动画逻辑与阶段划分（严格按顺序，分阶段显示、不挤一屏）

采用 **分阶段、分屏** 展示（参考 [Manim Community](https://www.manim.community/) 的 FadeIn/FadeOut/移出再入），保证每屏内容少而清晰、生成稳定：

- **第一阶段**：仅展示题目。用 Write 或 FadeIn 展示题目要点（如 "Which limit exists and is finite as x -> 0?"），放在上方 to_edge(UP) 或居中，scale(0.7) 左右。self.wait(1.5)。
- **第二阶段**：**逐项、分屏**展示**全部**选项，**选项个数与图个数一致**（例如四选项则画四幅图，不得只画两幅）。
  - 对选项 A：用 VGroup(选项标签 MathTex + 公式 MathTex + 结论) 放在画面中部；若画图则 1 个 Axes+plot，与公式用 arrange(DOWN, buff=0.4) 排在同一 VGroup 内。**文字与公式之间用 buff 留足间距，严禁重合。** self.play(FadeIn(option_a_group)) 或 Write，self.wait(2)。
  - **清空或移出**：self.play(FadeOut(option_a_group))，再展示选项 B（同样 VGroup：标签+公式+图）。依此类推**完整展示 C、D**（若有更多选项则每项一屏，不遗漏）。
  - 每项展示后必须 wait(1.5～2)，再 FadeOut 再下一项；可保留题目在顶部不 FadeOut。
- **第三阶段**：最后可单独一屏只展示「正确答案」：仅用 MathTex 标出正确选项（如 "Answer: B"）并用 GREEN 或 SurroundingRectangle 强调，self.wait(2)。
- **能画图的题目**：**每个选项各画一幅图**，该选项与图同屏、仅此一项；下一选项另起一屏（上一项已 FadeOut）。**务必遵守二、4 的 Axes 范围与裁剪规则；务必保证文字、公式、标签不重合。**

---

## 四、最终自检（生成前必须满足）

- 代码可直接运行，无语法错误
- **construct() 中至少有一次 self.play(...) 或 self.add(...)，且第一帧有可见内容（避免黑屏）**
- **同一帧内不同时展示所有选项和所有图**；采用 FadeOut 再 FadeIn 下一项的分阶段展示；**选项数与图数一致（四选项即四幅图）**
- **文字、公式、标签之间严禁重合**；使用 arrange、next_to 的 buff 留足间距
- 使用 arrange、to_edge、move_to 控制布局，无重叠、无超出
- **Axes 必有固定 x_range、y_range，曲线不冲出屏幕**
- 演示完整解题过程；可画图时每屏至多 1 选项+1 图，再切换下一项
- MathTex 中无中文
"""


# --------

def formular_prompt(
        latex_a,
        latex_b,
        **kwargs
):
    return f"""
你是一名 **Manim Community Edition（v0.18+）动画工程专家**，精通使用 Python 将**数学推导过程**转化为
**结构严谨、视觉清晰、符合教学直觉**的动画。

你的目标是：  
👉 **生成一份完整、可直接运行的 Manim Python 脚本**，用于清晰展示以下数学计算过程。

---

## 一、任务输入（仅用于理解，不要原样输出）

【操作描述（自然语言）】
你将进行公式的分步可视化推演

【输入公式 A（LaTeX）】
{latex_a}

---

## 二、硬性技术约束（必须 100% 严格遵守）

1. **导入要求**
   - 必须包含：
     `from manim import *`

2. **类结构**
   - 必须定义一个继承自 `Scene` 的类
   - 类名 **必须固定为**：
     `GenScene`

3. **动画入口**
   - 所有动画逻辑 **只能** 写在：
     `def construct(self):` 中
   - **防止黑屏**：必须用 `self.play(...)` 或 `self.add(...)` 将内容显示到画面；若只创建 mobject 而不 play/add，会渲染出黑屏。

4. **LaTeX / MathTex 规范（非常重要）**
   - 所有公式 **必须** 使用 `MathTex`
   - 所有 LaTeX 字符串 **必须** 使用 `r"..."` 原始字符串
   - **严禁在 MathTex 中出现任何中文字符**
     （包括注释、说明、单位、文字，否则直接编译失败）
   - 如需说明含义，只能使用数学符号或英文变量

5. **背景**
   - 使用 Manim 默认黑色背景（不做任何修改）

6. **输出限制（绝对遵守）**
   - ❌ 不要输出 Markdown 代码块
   - ❌ 不要输出解释、说明、注释性文字
   - ✅ **只输出纯 Python 代码**

---

## 三、核心动画逻辑（严谨性优先）

### 1️⃣ 保留原式（推导逻辑核心）
- 在展示下一步推导时：
  - **禁止销毁或替换**上一行公式
  - **禁止使用** `ReplacementTransform` 或直接 `Transform`
- 目标效果：
  👉 所有中间步骤始终保留在屏幕上，形成完整推导链

### 2️⃣ 推导方式（强制）
- ❌ 不要使用复杂的 `TransformMatchingTex` (容易因为 LaTeX 结构匹配不上而报错)。
- 新公式 **必须主要使用**：
  `TransformFromCopy(source, target)`
- 视觉效果：
  - 原公式保持不动
  - 新公式像是“从原公式复制并演化”而来

### 3️⃣ 布局规则
- 输入公式：
  - 公式 ：`to_edge(UL)`
- 推导过程：
  - 自上而下排列
  - 使用 `next_to(prev, DOWN, buff=0.5)`
  - 保持左对齐或居中对齐
- 调整所有公式使得他们适当减小大小所有公式统一 `scale(0.5)`

---

## 四、色彩与教学美学规范（必须体现）

### 🎨 颜色策略
- **输入项 / 已知量**：冷色调（`BLUE`, `TEAL`）
- **当前变化部分 / 运算符**：高亮色（`YELLOW`, `ORANGE`）
- **最终结果**：
  - 使用 `GREEN`
  - 必须添加边框强调

### 🎯 实现方式
- 颜色高亮 (安全模式)：
- 不要尝试拆分复杂的 LaTeX 字符串来染色。
- 如果需要强调，请直接改变整个公式的颜色，或者使用 SurroundingRectangle。
- 示例：self.play(step2.animate.set_color(YELLOW))

---

## 五、动画阶段划分（严格按顺序）

### 第一阶段：输入展示
1. 使用 `Write` 或 `FadeIn` 展示输入公式 A（和 B）
2. 将输入公式使用 `VGroup` 组织
3. 放置于屏幕顶部
4. `self.wait(1)`

---

### 第二阶段：逐步推导
1. 每一步推导单独成行
2. 使用 `TransformFromCopy` 生成新公式
3. 新公式位于上一行下方
4. 对“发生变化的部分”进行颜色高亮
5. 每一步后：
   `self.wait(1)`

---

### 第三阶段：结果定格
1. 使用 `Write` 展示最终结果公式
2. 放置在所有推导步骤最下方
3. 添加矩形强调：
box = SurroundingRectangle(result, color=GREEN, buff=0.2)
self.play(Create(box))
4. `self.wait(2)`

---

## 六、最终自检（生成前必须满足）

- 代码可直接运行，无语法错误
- Manim API 使用符合 v0.18+
- 无中文出现在 MathTex 中
- 未输出任何非代码内容
"""

# ------


def visualization_prompt(latex_a, latex_b, **kwargs):
    return f"""
你是一名 **Manim Community Edition（v0.18+）动画工程专家**，专注于
**数学对象 / 函数 / 几何 / 数值变化的动态可视化演示**。

⚠️ 本任务【不进行任何公式推导、不展示推演链】，
仅基于给定数学表达式，构建**直观、稳定、可运行的动态图形演示**。

---

## 一、任务输入（仅用于理解，不要原样输出）

【任务类型】
数学可视化演示（无推导）

【输入公式（LaTeX，仅用于确定可视化对象）】
{latex_a}

---

## 二、硬性技术约束（必须 100% 严格遵守）

### 1️⃣ 基础结构（不可变）

- 必须包含：
  `from manim import *`

- 必须定义：
  ```python
  class GenScene(Scene):
      def construct(self):
          ...
  ```

* 所有动画逻辑 **只能** 写在 `construct` 中
* **防止黑屏**：必须用 `self.play(...)` 或 `self.add(...)` 将 mobject 显示到画面。例如 `self.play(Write(title))` 或 `self.add(axes)`。若只创建对象而不 play/add，会渲染出黑屏。

---

### 2️⃣ MathTex 使用规范（极其重要）

* 若显示公式：

  * **只能**使用 `MathTex`
  * **必须**使用 `r"..."` 原始字符串
  * ❌ MathTex 中 **禁止任何中文**
* 允许：

  * 不显示公式，仅作为“理解依据”

---

### 3️⃣ 场景与布局规范（重点修改）

* ❌ 不使用左侧 / 右侧推导区
* ❌ 不保留推导链
* ❌ 不使用 `to_edge`

✅ **所有可视化对象必须位于画面正中心**

允许的布局方式：

```python
obj.move_to(ORIGIN)
obj.scale(0.8)
```

或默认中心位置（推荐）

---

## 三、可视化内容生成规则（只做图，不推公式）

### ✅ 根据输入类型，自动选择可视化形式

| 数学对象    | 可视化方式                   |
| ------- | ----------------------- |
| 函数      | Axes + plot             |
| 参数变化    | ValueTracker            |
| 极值 / 零点 | Dot                     |
| 几何      | Line / Circle / Polygon |
| 向量      | Arrow / Vector          |
| 面积 / 积分 | axes.get_area           |
| 数值变化    | always_redraw           |

---

## 四、稳定性优先原则（必须严格遵守）

### ❗ 为避免 Manim 报错，强制约束如下：

* ❌ 不使用不必要参数
  （如 `fill_color`、`stroke_opacity`、复杂 style）

* ❌ 不使用高风险 API 或冷门参数

* ✅ 只使用 **Manim v0.17+ 稳定常用接口**

* 推荐安全写法示例：

```python
axes = Axes()
graph = axes.plot(lambda x: x**2)
dot = Dot()
```

---

### 📐 坐标轴与 π：画图时勿用数值刻度（必须遵守）

**【必须】** 可视化计算时，凡坐标轴涉及圆周率的地方一律使用 Manim 的 `PI` 常量或 LaTeX 的 `\\pi` 符号作为刻度标签，**不得使用 3.14、6.28、1.57 等数值**。

当图像涉及**三角函数、弧度、周期**（即 x 或 y 范围与 π 有关）时：

* ❌ **禁止**使用默认数值刻度，否则会显示 3.14, 6.28, 1.57 等小数挤满坐标轴，难以阅读。
* ✅ **必须**在坐标轴上使用 **π 符号刻度**，而非小数。

**做法：**

1. 创建 Axes 时关闭自动数字，例如：
   `axes = Axes(x_range=[-2*PI, 2*PI, PI/2], axis_config={{"include_numbers": False}})`
   或对 `x_axis_config` / `y_axis_config` 设置 `"include_numbers": False`。
2. 在需要的位置**手动添加 π 的符号标签**（用 MathTex），例如：

```python
# 示例：x 轴为弧度时，用 π 符号而非 3.14（生成代码时 LaTeX 用 r"..." 与单反斜杠，如 r"\pi"）
values_x = [(0, "0"), (PI/2, r"\\frac{{\\pi}}{{2}}"), (PI, r"\\pi"), (2*PI, r"2\\pi")]
for x_val, tex_str in values_x:
    lab = MathTex(tex_str).scale(0.5).next_to(axes.c2p(x_val, 0), DOWN, buff=0.2)
    self.add(lab)
```

* 只添加**必要、稀疏**的刻度（如 0, π/2, π, 3π/2, 2π），避免过密。

---

## 五、动画行为规范（演示为主）

* 允许的动画：

  * `Create`
  * `Write`
  * `FadeIn`
  * `MoveAlongPath`
  * `always_redraw`
  * `ValueTracker`

* 参数变化应体现：
  👉 **“数值变化 → 图像响应”**

* 每个关键动画后：

  ```python
  self.wait(1)
  ```

---

## 六、输出限制（绝对遵守）

* ❌ 不输出 Markdown
* ❌ 不输出任何解释文字
* ❌ 不输出注释性说明
* ✅ **只输出完整、可直接运行的 Python 代码**

---

## 七、最终自检（生成前必须满足）

* Manim v0.17+ 可直接运行
* 场景中只有“可视化演示”，无推导
* 所有图像位于画面中心
* 未使用高风险参数
* 未输出任何非代码内容
  """


def for_vis_prompt(latex_a, latex_b, **kwargs):
    return f"""
你是一名 **Manim Community Edition（v0.18+）动画工程专家**，精通使用 Python 将**数学推导过程**
与**动态图形可视化**结合，构建**结构严谨、逻辑清晰、符合教学直觉、视觉美观**的数学动画。

你的目标是：  
👉 **生成一份完整、可直接运行的 Manim Python 脚本**，用于清晰展示以下数学计算过程，  
并在合适位置引入“画图 / 函数 / 几何 /数值变化”等可视化，使推导过程更具直观性。

---

## 一、任务输入（仅用于理解，不要原样输出）

【操作描述（自然语言）】
可视化推演

【输入公式 A（LaTeX）】
{latex_a}

---

## 二、硬性技术约束（必须 100% 严格遵守）

1. **导入要求**
   - 必须包含：
     `from manim import *`

2. **类结构**
   - 必须定义一个继承自 `Scene` 的类
   - 类名 **必须固定为**：
     `GenScene`

3. **动画入口**
   - 所有动画逻辑 **只能** 写在：
     `def construct(self):` 中
   - **防止黑屏**：必须用 `self.play(...)` 或 `self.add(...)` 将内容显示到画面；若只创建而不 play/add，会渲染出黑屏。

4. **LaTeX / MathTex 规范（非常重要）**
   - 所有公式 **必须** 使用 `MathTex`
   - 所有 LaTeX 字符串 **必须** 使用 `r"..."` 原始字符串
   - **严禁在 MathTex 中出现任何中文字符**
   - 如需说明含义，只能使用数学符号或英文变量

5. **背景**
   - 使用 Manim 默认黑色背景（不做任何修改）

6. **输出限制（绝对遵守）**
   - ❌ 不要输出 Markdown 代码块
   - ❌ 不要输出解释、说明、注释性文字
   - ✅ **只输出纯 Python 代码**

---

## 三、核心动画逻辑（严谨性优先）

### 1️⃣ 推导链完整保留（不可破坏）

- 在展示下一步推导时：
  - ❌ 不要使用复杂的 `TransformMatchingTex` (容易因为 LaTeX 结构匹配不上而报错)。
  - ❌ 禁止销毁或替换上一行公式
  - ❌ 禁止使用 ReplacementTransform 或 Transform
- 所有步骤必须**永久保留在屏幕上**
- 形成**从上到下的完整推导链条**

### 2️⃣ 推导生成方式（强制）

- 新公式必须主要使用：
  `TransformFromCopy(source, target)`
- 效果：
  👉 原公式保持不动，新公式像是“从原式复制并演化”而来

### 3️⃣ 布局规则

- 输入公式：
  - 使用 `to_edge(UL)`
- 推导过程：
  - 自上而下排列
  - 使用 `next_to(prev, DOWN, buff=0.5)`
  - 对齐方式统一（左对齐或居中）
- 调整所有公式使得他们适当减小大小所有公式统一 `scale(0.5)`

---

## 四、色彩与教学美学规范（必须体现）

### 🎨 颜色策略

- **输入项 / 已知量**：`BLUE` / `TEAL`
- **当前变化部分 / 运算符**：`YELLOW` / `ORANGE`
- **最终结果**：
  - 使用 `GREEN`
  - 必须添加边框强调

### 🎯 实现方式

- 颜色高亮 (安全模式)：
- 不要尝试拆分复杂的 LaTeX 字符串来染色。
- 如果需要强调，请直接改变整个公式的颜色，或者使用 SurroundingRectangle。
- 示例：self.play(step2.animate.set_color(YELLOW))

---

## 五、动态可视化增强规范（本提示词新增重点）

在**不破坏推导链、不覆盖公式、不替换步骤**的前提下，  
允许并鼓励在以下情况插入**画图/几何/函数/数值动态可视化模块**：

### ✅ 何时引入“画图/可视化”

若题目中涉及以下类型，请自动添加对应可视化：

| 类型 | 可视化形式 |
|------|-------------|
| 函数解析 | Axes + plot + 动态变化 |
| 极值/零点 | 点的移动 + 高亮 |
| 几何 | Polygon / Circle / Line |
| 向量 | Arrow / Vector |
| 坐标变换 | 动态平移/旋转 |
| 面积/积分 | 填充区域 |
| 数值逼近 | ValueTracker + 实时更新 |
| 概率/统计 | 柱状图 / 折线图 |

---

### 📐 坐标轴与 π：画图时勿用数值刻度（必须遵守）

当涉及**三角函数、弧度、周期**（x 或 y 与 π 有关）时：

* ❌ **禁止**使用默认数值刻度（会显示 3.14, 6.28 等小数挤在坐标轴上）。
* ✅ **必须**在坐标轴上使用 **π 符号刻度**：用 MathTex 在对应位置添加如 0, π/2, π, 2π 等符号。

**做法：** Axes 创建时对轴设置 `axis_config={{"include_numbers": False}}`，再手动在关键位置添加刻度标签，例如：

```python
# x 轴为弧度时，只加 π 符号标签
for x_val, tex_str in [(0, "0"), (PI/2, r"\\frac{{\\pi}}{{2}}"), (PI, r"\\pi"), (2*PI, r"2\\pi")]:
    lab = MathTex(tex_str).scale(0.5).next_to(axes.c2p(x_val, 0), DOWN, buff=0.2)
    self.add(lab)
```

只添加**稀疏、必要**的刻度，避免过密。

---

### 📐 可视化布局规范（必须遵守）

- 可视化区域：
  - 必须放在**屏幕右侧或下方**
  - ❌ 绝不可遮挡推导公式
- 推导链与图像**并行存在**
- 图像缩放合理：
  - 不抢主视觉（推导仍为主体）

---

### 🔁 推导 ↔ 可视化联动原则

在合适步骤中：

- 使用 `Indicate` / `Circumscribe` 高亮公式中的变量
- 同步驱动图像变化，例如：
  - 改变函数参数
  - 移动点
  - 更新向量长度
- 体现：
  👉 “公式变化 ⟷ 图像响应” 的教学联动

---

## 六、动画阶段划分（严格顺序）

### 第一阶段：输入展示

1. 使用 `Write` 或 `FadeIn` 展示输入公式 A（和 B）
2. 使用 `VGroup` 组织
3. 放置于顶部
4. `self.wait(1)`

---

### 第二阶段：逐步推导（主线）

1. 每一步推导单独成行
2. 使用 `TransformFromCopy`
3. 位于上一行下方
4. 对变化部分高亮
5. 每一步后：
   `self.wait(1)`

---

### 第三阶段：动态图形辅助（并行增强）

1. 在**不删除、不遮挡公式**前提下引入图形
2. 图形变化与公式变化同步
3. 使用 `ValueTracker` / `always_redraw` / `UpdateFromFunc`
4. 图像只作为**理解辅助，不取代推导**

---

### 第四阶段：结果定格

1. 使用 `Write` 展示最终结果公式
2. 放在最下方
3. 添加强调框：
```python
box = SurroundingRectangle(result, color=GREEN, buff=0.2)
self.play(Create(box))
```
4. self.wait(2)
七、最终自检（生成前必须满足）
- 代码可直接运行
- Manim API 符合 v0.18+
- MathTex 中无中文
- 所有推导步骤完整保留
- 图像不遮挡、不替换、不覆盖公式
- 未输出任何非代码内容
"""
