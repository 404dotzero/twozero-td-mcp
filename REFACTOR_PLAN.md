# Pisang Legacy Elimination Plan

## Текущее состояние

Оригинальный план рефактора помечен как "completed", но по факту **готова только инфраструктура**. Сама миграция кода инструментов не сделана.

### Что СДЕЛАНО (инфраструктура)
- `PisangTool` базовый класс в `/project1/pisang/tools/PisangTool` (75 строк)
- `ItemsList` экстеншн на `/project1/pisang/items/` — полностью работает (SetDisplay, MoveCursor, SelectFirst, SetCallbacks и т.д.)
- `PisangDialog` экстеншн на `/project1/pisang/dialog/` — поддерживает и `callback=` (прямые ссылки на методы) и легаси `runOp=`/`fn=`
- Все 15 тулов — baseCOMP внутри `/project1/pisang/tools/`
- Фреймворк-скрипты (`open`, `close`, `onKeyboard`, `onTextInput`, `upDown`, `drop`) имеют двойной диспатч: сначала `ActiveTool`, потом фоллбэк на `currentTool`
- `open` читает `LABEL`/`COLOR`/`HELP` из атрибутов класса, устанавливает `parent().ActiveTool`, вызывает `toolExt.Init()`

### 4 тула ПОЛНОСТЬЮ конвертированы

| Тул | Экстеншн | Строк | Статус |
|-----|----------|-------|--------|
| `toolSelect` | `ToolSelectTool` (117) | — | Полностью, + сканирует легаси для обратной совместимости |
| `findOp` | `FindOpTool` (121) | — | Полностью |
| `locations` | `locationsTool` (153) | — | Полностью, lambda-коллбэки для диалога |
| `searchCode` | `searchCodeTool` (112) | — | Полностью |

### 10 тулов ВСЁ ЕЩЁ НА ЛЕГАСИ

Их экстеншны — пустые обёртки, которые делают только `self._legacyScript.run({'fn':'...'})`:

| Тул | Легаси строк | Сложность | Особенности |
|-----|-------------|-----------|-------------|
| `installDialog` | 148 | **Низкая** | Чекбоксы установки, `checkAppSettings` |
| `VST` | 201 | **Средняя** | Браузер VST пресетов, `onCreateVst` |
| `checkVST` | 216 | **Средняя** | Валидация VST, `manageVST` |
| `searchRecentFile` | 286 | **Средняя** | Браузер недавних файлов, `goToFile`/`goToFolder` |
| `palette` | 325 | **Средняя** | TD palette, загрузка .tox |
| `puginSettings` | 334 | **Сред-Выс** | UI настроек, назначение хоткеев (спец. `mode['waitHotkey']` флоу), диалоги |
| `library` | 542 | **Высокая** | Файловый I/O, сбор ассетов, цепочки диалогов, zip/tox |
| `createOP` | 485 | **Очень выс** | TD native Create OP, `par.Args`, фильтры семейств, совместимые опы, история |
| `ai` | 767 | **Высокая** | twozero, async запросы, ai_history, ai_templates |
| `teamsAsync`+`TeamsCore` | 626+1385 | **Очень выс** | Частично мигрирован. TeamsAsyncTool имеет часть методов, но делегирует Init/OnEnter/etc. в TeamsCore. TeamsCore: 30+ `op('../...')` ссылок, циклические коллбэки через `currentTool.run({'fn':...})` |

### Костыли в фреймворке (чистить после конвертации тулов)

1. **`topUi/onFocusLost`** — `op('../currentTool').run({'fn':'onClickOutside'})` вместо `ActiveTool.OnClickOutside()`
2. **`onKeyboard`** — фоллбэк на `currentTool.run(...)` (строки 8, 44)
3. **`onTextInput`** — фоллбэк на `currentTool.run(...)` (строка 17)
4. **`upDown`** — фоллбэк на `currentTool.run(...)` (строка 8)
5. **`drop`** — фоллбэк на `currentTool.module.OnDropGetResults(...)` (строка 13)
6. **`open`** — полный легаси-путь: копирует текст в `currentTool`, запускает init через eval (строки 127-129)
7. **`toolSelect/ToolSelectTool`** — `_getAllToolOps()` всё ещё сканирует pisang root на `#TOOL` DAT-ы (строки 53-55)
8. **`currentTool` textDAT** — удалить когда все легаси-пути убраны
9. **`setFirst`** — обёртка `op('items').ext.ItemsList.SelectFirst()` — удалить когда ни один легаси-тул не вызывает
10. **`items/setDisplay`** — обёртка — удалить
11. **`items/checkActive`** — обёртка — удалить
12. **`teamsCore` COMP** (24 ребёнка, 1385-строчный TeamsCore экстеншн) — слить/убить
13. **14 старых textDAT тулов** на уровне pisang root — удалить
14. **Стейт в Core** — `CreateOpData`, `Index`, `Row0`, `SearchResult`, `CurrentData`, `PrevEditText`, `Teams` — перенести в тулы

---

## Паттерны перевода (legacy → extension)

Все легаси-скрипты следуют одному паттерну:
```python
#TOOL
#LABEL:...
items = op('itemsData')
defTextComp = op('textInput')

def setDisplay():
    op('items').op('setDisplay').run(display, colors)

def init():
    setDisplay()
    ...
```

**Таблица замен:**

| Legacy | Extension |
|--------|-----------|
| `items = op('itemsData')` | `self.Pisang.op('itemsData')` в методах |
| `display`/`colors` глобалы | `self._display`/`self._colors` в `__init__` |
| `def init():` | `def Init(self):` |
| `def onTextInput():` + `defTextComp` | `def OnTextInput(self, text, prevText):` |
| `op('setDisplay').run(d,c)` | `self.Items.SetDisplay(self._display, self._colors)` |
| `op('setFirst').run()` | `self.Items.SelectFirst()` |
| `op('items').op('checkActive').run(N)` | `self.Items._scrollToRow(N)` |
| `op('cur')[0,0]` | `self.Items.Cursor` |
| `op('close').run()` | `self.Pisang.op('close').run()` |
| `op('openDialog').run(...)` | `self.OpenDialog(text=..., callback=self.Method)` |
| `parent().CurrentData` | `self._currentData` |
| `parent().PrevEditText` | аргумент `prevText` |
| `parent().CreateOpData` | `self._createOpData` |
| `parent().GetModKeys()` | `self.Core.GetModKeys()` |
| `parent().LoadIndexDat(x)` | `self.Core.LoadIndexDat(x)` |
| `parent().PrintResult(...)` | `self.Core.PrintResult(...)` |
| `parent().RegularColSearch(...)` | `self.Core.RegularColSearch(...)` |
| `parent().SaveOrigin()` | `self.Core.SaveOrigin()` |
| `parent().RestoreOrigin()` | `self.Core.RestoreOrigin()` |

---

## Порядок конвертации

### Фаза A: Простые тулы (низкий риск, валидация паттерна)

#### A1: `installDialog` (148 строк, НИЗКАЯ сложность)
- Нет `parent()` стейта кроме `parent().par`
- Читает `settings`, `defaultSettings`, вызывает `checkAppSettings`
- Диалог с чекбоксами, один коллбэк `doInstall`
- **Миграция**: Все функции → методы `InstallDialogTool`. `doInstall` → `self._doInstall(result)` callback.

#### A2: `VST` (201 строка, СРЕДНЯЯ)
- Браузер VST пресетов
- Используется `op('index')`, `op('cur')`, `op('settings')`, `op('itemsData')`, `op('textInput')`
- **Миграция**: Прямолинейная замена `op('...')` → `self.Pisang.op('...')` / `self.Items.*`

#### A3: `checkVST` (216 строк, СРЕДНЯЯ)
- Почти идентичная структура с VST
- **Миграция**: Тот же паттерн

#### A4: `searchRecentFile` (286 строк, СРЕДНЯЯ)
- Браузер недавних файлов
- Использует `Core.LoadIndexDat`, `Core.RegularColSearch`, `Core.PrintResult`
- **Миграция**: Стандартная

### Фаза B: Средние тулы

#### B1: `palette` (325 строк, СРЕДНЯЯ)
- TD palette browser с загрузкой .tox
- Старый формат вызова диалога (позиционные аргументы) — PisangDialog уже обрабатывает оба формата
- **Миграция**: Стандартная + диалог через `self.OpenDialog(...)` с callback

#### B2: `puginSettings` (334 строки, СРЕДНЕ-ВЫСОКАЯ)
- UI настроек с назначением хоткеев
- **Спецкейс**: `mode['waitHotkey',1]` — `onKeyboard` уже диспатчит `ActiveTool.OnHotkey(hotkey)` (строка 42), тулу нужен только метод `OnHotkey(self, hotkey)`
- Множество диалог-коллбэков
- Вызовы `op('items/checkActive').run(...)` и `op('items').op('rebuild').run()`
- **Миграция**: `items/checkActive` → `self.Items._scrollToRow(...)`, `items/rebuild` → `self.Items.Rebuild()`

### Фаза C: Сложные тулы

#### C1: `library` (542 строки, ВЫСОКАЯ)
- Файловый I/O: .tox, zip, сбор ассетов
- `renameOpsToAvoidDuplicates` — дубликат того что уже есть в TeamsAsyncTool → **дедупликация**: вынести в `PisangTool` или общий модуль
- Цепочки диалогов: `saveSelectionYes` → `saveSelectionYesAssets`
- `parent().CurrentData` → `self._currentData`
- **Миграция**: Все функции → методы. Диалог-коллбэки → `callback=self._method`

#### C2: `createOP` (485 строк, ОЧЕНЬ ВЫСОКАЯ)
- TD native Create OP через `parent().par.Args`
- `parent().CreateOpData` — фильтры между вызовами → `self._createOpData`
- `createOpsFromTxt`, `onCreateCompatible`, `onCreateComp` — сложное создание опов
- `label/toTDdialog` UI toggle
- **ОБЯЗАТЕЛЬНО СОХРАНИТЬ**: `parent().par.Args`, `parent().par.Createop`, `onCreateOpFromTD`, `launch`, `launchTDcreateOpDialog` — остаются на уровне pisang root. Тул читает `self.Pisang.par.Args`.
- **Миграция**: Module-level код (libFolder, modKeys) → `Init()`. Глобалы `ctrl`/`shift` → `self._ctrl`/`self._shift` в `Init()`.

#### C3: `ai` (767 строк, ВЫСОКАЯ)
- Интеграция с `twozero` для LLM запросов
- `ai_history`, `ai_templates` — ссылки на COMPы
- Async запросы/ответы
- `OnDropGetResults(comp, info)` на уровне модуля → `OnDrop(self, comp, info)` в экстеншне
- **Миграция**: Все функции → методы AiTool

### Фаза D: teamsAsync + TeamsCore слияние

#### D1: Поглотить TeamsCore в TeamsAsyncTool

Самая большая миграция. TeamsCore (1385 строк) + teamsAsync legacy (626 строк) + TeamsAsyncTool (322 строки, частично мигрирован).

**Текущее состояние TeamsAsyncTool:**
- Уже есть: `saveSelectionYes`, `saveSelectionYesAssets`, `createOpsFromTox`, `createOpsFromFolder`, `unzipAndCreateOps`, `getAssets`, `_renameOpsToAvoidDuplicates`, `human_readable_size`, `_setupFolders`
- Делегирует: `Init`, `OnTextInput`, `OnEnter`, `OnCurrentChange`, `OnLeft`, `OnRight`, `OnItemLMB`, `OnItemRMB`, `OnEsc`, `OnDeleteKey` → все идут в `self._core` (TeamsCore)

**TeamsCore проблемы:**
- 30+ `op('../...')` ссылок на фреймворк
- Циклические коллбэки: `currentTool.run({'fn':'saveSelectionYes',...})`, `currentTool.run({'fn':'unzipAndCreateOps'},...)` — **самое опасное**
- API/auth логика (getAuth, saveAuth, _threaded_request и т.д.) — оставить как внутренний модуль
- Диалог-коллбэки через отдельные DAT-ы внутри teamsCore COMP

**План слияния:**
1. UI/навигация → TeamsAsyncTool
2. Диалог-коллбэки → методы TeamsAsyncTool с `callback=self._onXxxConfirm`
3. Команды (`commands`, `executeCommand`) → TeamsAsyncTool
4. API/auth → дочерний COMP или внутренний класс (не нужен доступ к фреймворку)
5. `op('../...')` → `self.Pisang.op(...)` / `self.Items.*` / `self.Core.*`
6. `currentTool.run({'fn':'saveSelectionYes',...})` → `self.saveSelectionYes(result)` (прямой вызов)
7. Удалить TeamsCore COMP и его callback DAT-ы
8. Удалить legacy `teamsAsync` textDAT

### Фаза E: Чистка фреймворка (после конвертации ВСЕХ тулов)

#### E1: Убрать легаси-фоллбэки из фреймворк-скриптов
- `onKeyboard`, `onTextInput`, `upDown`, `drop` — убрать `currentTool.run(...)` фоллбэки
- `open` — убрать легаси-путь (строки 127-131)
- `topUi/onFocusLost` — заменить на `ActiveTool.OnClickOutside()` диспатч

#### E2: Удалить legacy textDAT-ы
14 старых скриптов на уровне pisang root: `ai`, `VST`, `checkVST`, `createOP`, `library`, `palette`, `puginSettings`, `installDialog`, `searchRecentFile`, `teamsAsync`, `searchCode`, `findOp`, `toolSelect`, `locations`

#### E3: Удалить фреймворк-обёртки
- `currentTool` textDAT
- `setFirst` скрипт
- `items/setDisplay`, `items/checkActive`

#### E4: Почистить `toolSelect/ToolSelectTool`
- Убрать `_isLegacyToolOp()`, `_getLegacyLabel()` и сканирование legacy DAT-ов

#### E5: Почистить Core
- `CreateOpData` → живёт в `CreateOpTool._createOpData`
- `CurrentData` → живёт в тулах (`self._currentData`)
- `PrevEditText` → фреймворк передаёт `prevText` аргументом
- `Teams` → удалить после D1
- `Index`/`Row0`/`SearchResult` — пока оставить (используются `locations` через Core)

#### E6: Дедупликация утилит
- `renameOpsToAvoidDuplicates` — в TeamsAsyncTool И library → общий модуль
- `human_readable_size` — единственный источник
- `getAssets` — если используется library → общий модуль

#### E7: Обновить agents_md

---

## Риски

- **Нет фоллбэка**: после миграции старый textDAT — мёртвый код. Откат через `.tox` бэкап.
- **TeamsCore `currentTool.run` коллбэки**: самое опасное место. Циклические вызовы через копию скрипта в currentTool.
- **Module-level код**: легаси-скрипты исполняют код на уровне модуля при каждом `run()`. В экстеншнах это → `Init()` или конкретный метод.
- **`items/lmb`/`items/rmb`**: вызываются из UI кнопок (репликатор). `open` уже настраивает `ItemsList.SetCallbacks(...)`. Цепочка работает для обоих типов тулов, скрипты можно удалить в фазе E.
