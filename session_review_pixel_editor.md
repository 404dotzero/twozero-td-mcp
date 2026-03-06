# Резюме сессии: починка pixel_editor (теперь pixe_icon_editor)

## Что было сломано

Контейнер `/project1/pixel_editor` — простой пиксельный редактор для рисования иконок. Три проблемы:

### 1. panelexec — `'td.Panel' object is not subscriptable` (340 повторений в логе)

**Причина**: в `canvas/panelexec` использовался устаревший синтаксис доступа к panel-значениям:
```python
canvas.panel['select'][0]    # НЕПРАВИЛЬНО — td.Panel не словарь
canvas.panel.select           # ПРАВИЛЬНО — это атрибут
```

**Исправление**: заменил `panel['xxx'][0]` → `panel.xxx` для `select`, `rselect`, `insideu`, `insidev`.

**Починил быстро** — ошибка в логе была явной, причина очевидна.

### 2. ext0object — расширение PixelEditor не загружалось

**Причина**: параметр `ext0object` содержал строку `ext_pixel_editor` (просто имя DAT), а нужно было `op('./ext_pixel_editor').module.PixelEditor(me)` — стандартный формат для extension object в TD.

**Что усугубило проблему**: DAT `ext_pixel_editor` имел `par.language = 'text'` вместо `'python'`. Два бага одновременно — неправильный ext0object И неправильный язык DAT.

**Починил с трудом** — сделал ~8 лишних вызовов, пробуя разные подходы. Подробности ниже.

### 3. Абсолютные пути в скриптах — всё ломается при переименовании

**Причина**: все три скрипта внутри `canvas/` (`canvas_script_callbacks`, `panelexec`, `keyboard_exec`) использовали захардкоженные абсолютные пути вида `op('/project1/pixel_editor/...')`. При переименовании контейнера в `pixe_icon_editor` всё сразу перестало работать.

**Исправление**: заменил на относительные пути через `scriptOp` / `me`:
```python
# canvas_script_callbacks (scriptTOP callback):
root = scriptOp.parent().parent()    # scriptOp=canvas_script → canvas → pixe_icon_editor
dat  = root.op('pixel_data')

# panelexec / keyboard_exec:
canvas = me.parent()                 # me=panelexec → canvas
root   = me.parent().parent()        # → pixe_icon_editor
```

**Это была моя ошибка** — я сам написал абсолютные пути при починке panelexec и создании keyboard_exec. Пользователь справедливо указал на антипаттерн.

---

## Что было добавлено

### 4. Сдвиг стрелками (ShiftPixels)

Добавлен метод `ShiftPixels(dx, dy)` в extension + `keyboardinCHOP` + `chopexecuteDAT` внутри canvas. При наведении мышки на канвас стрелки сдвигают всю картинку на 1 пиксель.

**Косяк**: keyboardinCHOP создаёт каналы с префиксом `k` (`kup`, `kdown`, `kleft`, `kright`), а я написал `ARROW_MAP` с ключами без префикса (`up`, `down`...). Не сработало с первого раза — пришлось исправлять на `kleft`, `kright`, `kup`, `kdown`.

### 5. Прозрачность фона (slider_bg_a)

Добавлен слайдер альфы фона — копия `slider_bg_b` с `label='A'`, `value0=1.0`, `alignorder=11`. Подключён в `canvas_script_callbacks` → `bg_a`. Залитые пиксели (foreground) всегда alpha=1.0.

---

## Анализ: почему я тратил лишние вызовы

### Проблема 1: Не знал формат ext0object

Я не знал, что `ext0object` в TD ожидает строку вида `op('./dat').module.ClassName(me)` в режиме CONSTANT. Пробовал:
1. Задать OP-ссылку напрямую (`comp.par.ext0object = comp.op('ext_pixel_editor')`) — получил `./ext_pixel_editor`, не сработало
2. Задать как expression — не сработало (TD eval'ит ext0object как Python-строку в CONSTANT mode, а не как expression)
3. Пытался менять `comp.par.ext` думая что это количество расширений (а это pageIndex sequence)

### Проблема 2: Не знал что par.language влияет на загрузку extension

Даже когда формат ext0object был правильный, расширение не грузилось из-за `par.language = 'text'`. Я потратил время на диагностику, не проверив язык DAT сразу.

### Проблема 3: Путал expression mode и constant mode

Пробовал `comp.par.ext0object.expr = "op(...)..."` (expression mode), а пользователь подсказал что нужен CONSTANT mode со строкой. В TD ext0object eval'ит строковое значение как Python-код при инициализации расширения — это НЕ parameter expression.

### Проблема 4: Ложные ошибки expressCHOP

`td_get_errors` показывал ошибки в `field_h/i` и `field_w/i` expressCHOP (`me.inputVal+2*me.inputs[0][1][0]`). Я потратил время на диагностику, но оказалось что это false positive — `me.inputVal` работает только в cook-контексте, а `td_get_errors` пробует eval вне cook. Реально CHOP работал нормально.

### Проблема 5: Писал абсолютные пути в скриптах

В scriptTOP/panelexecuteDAT/chopexecuteDAT нужно использовать пути относительно `scriptOp` или `me`, а не абсолютные. Я сам создал эту проблему — хардкодил `/project1/pixel_editor/...` во всех скриптах, и при переименовании контейнера всё сломалось.

### Проблема 6: Не знал что keyboardinCHOP добавляет префикс `k`

Каналы клавиш именуются `kup`, `kleft` и т.д., а не `up`, `left`. Написал ARROW_MAP с неправильными ключами, пришлось исправлять.

---

## Чего не хватает в инструкциях MCP (Context B)

### 1. Формат ext0object для extensions — КРИТИЧЕСКИ ВАЖНО

Нет ни слова о том, как правильно задавать extension на COMP. Нужно добавить:

```
EXTENSION SETUP:
ext0object expects a CONSTANT string (NOT expression mode) containing Python code
that TD evaluates during initializeExtensions(). Standard format:
  op('./myExtensionDat').module.MyClassName(me)
where myExtensionDat is a textDAT with par.language='python' containing the class.
NEVER set ext0object as just the DAT name ('myExtensionDat') — that won't work.
NEVER use ParMode.EXPRESSION for ext0object — use ParMode.CONSTANT with the string value.
Also ensure the extension DAT has par.language='python', not 'text'.
```

### 2. td.Panel — синтаксис доступа к panel-значениям

Инструкции не упоминают, что `panel` — это объект с атрибутами, а не словарь. Нужно добавить в hints или instructions:

```
TD PYTHON API — Panel access:
comp.panel.select      ✓ correct (attribute access)
comp.panel['select']   ✗ wrong ('td.Panel' object is not subscriptable)
Panel values are float attributes, not dict entries.
```

### 3. Относительные пути в скриптах — ВАЖНО

В scriptTOP/CHOP/SOP/DAT callbacks ВСЕГДА использовать пути относительно `scriptOp` или `me`, а не абсолютные `op('/project1/...')`. Абсолютные пути ломаются при переименовании/копировании контейнеров.

```
SCRIPT PATH RULE:
In scriptTOP/CHOP/SOP/DAT callbacks, ALWAYS use relative paths via scriptOp or me:
  root = scriptOp.parent().parent()   # for scriptTOP callbacks
  root = me.parent().parent()         # for panelexec/chopexec/etc.
NEVER hardcode absolute paths like op('/project1/myComp/child') — they break
when the container is renamed or copied.
```

### 4. keyboardinCHOP — имена каналов с префиксом `k`

```
keyboardinCHOP channel names have a 'k' prefix: 'kup', 'kdown', 'kleft', 'kright',
'ka', 'kb', etc. — NOT 'up', 'down', 'left', 'right', 'a', 'b'.
```

### 5. expressCHOP cook-only properties

`me.inputVal`, `me.chanIndex`, `me.sampleIndex` работают ТОЛЬКО в cook-контексте expressCHOP. Вызов `par.expr0expr.eval()` снаружи всегда бросает ошибку — это НЕ реальная ошибка оператора. Нужно:
- Либо добавить в hints topic (напр. `parameters` или `scripting`)
- Либо исправить `td_get_errors` чтобы не пытался eval'ить expressCHOP expressions вне cook

### 6. textDAT language pitfall

В AGENTS.md есть правило: "When creating textDAT for scripts: ALWAYS set `newOp.par.language = 'python'`". Но нет правила для **диагностики**: "When extension doesn't load, check that the extension DAT has `par.language = 'python'`, not `'text'`." Агент должен знать это как одну из первых вещей для проверки.

---

## Рекомендуемые изменения

| Где | Что добавить |
|-----|-------------|
| MCP instructions (Context B) | Правило про ext0object формат (CONSTANT mode, `op('./dat').module.Class(me)`) |
| MCP instructions (Context B) | Правило про panel attribute access (не subscriptable) |
| MCP instructions (Context B) | Правило про относительные пути в скриптах (не абсолютные) |
| hints → `construction` topic | keyboardinCHOP каналы с префиксом `k` |
| hints → `scripting` topic | Cook-only properties expressCHOP |
| hints → `parameters` topic | ext0object format и par.language check |
| `td_get_errors` код | Не eval'ить expressCHOP expressions (или помечать как "cook-only, may be false positive") |
