# Kuaishou Creator Platform Selectors Reference

## Distribution Plan List Page
URL: `https://daren.kuaishou.com/distribution-plan-list`

### Table Structure
```
table
├── thead
│   └── tr
│       ├── th: 推广计划名称
│       ├── th: 状态
│       ├── th: 任务时间
│       ├── th: 创建时间
│       └── th: 操作
└── tbody
    └── tr (multiple)
        ├── td: plan name
        ├── td: status
        ├── td: time range
        ├── td: create time
        └── td: action buttons
```

### Row Selectors

| Element | Selector |
|---------|----------|
| Table rows | `table tbody tr` |
| Plan name cell | `table tbody tr td:nth-child(2)` |
| Status cell | `table tbody tr td:nth-child(3)` |
| Time range cell | `table tbody tr td:nth-child(4)` |
| Create time cell | `table tbody tr td:nth-child(5)` |
| Action buttons cell | `table tbody tr td:last-child` |

### Action Buttons (per row)

Buttons are typically in the last cell, index order:
- Index 0: "编辑" (Edit) - pencil icon
- Index 1: "数据" (Data/Stats) - chart icon  
- Index 2: "更多" (More) - three dots menu

```javascript
// Click data button for row N (1-indexed)
`table tbody tr:nth-child(${N}) td:last-child button:nth-child(2)`

// Or find by aria-label
td:last-child button[aria-label="数据"]
td:last-child button[title="数据"]
```

## Data Drawer / Overlay

When clicking "数据" button, a drawer opens with class:
- `.ks-drawer`
- `.distribution-plan-detail-dialog`
- `[role="dialog"]`

### Drawer Structure
```
.ks-drawer
├── .ks-drawer__header
│   ├── .ks-drawer__title (task name)
│   └── .ks-drawer__close (close button)
├── .ks-drawer__body
│   ├── .ks-card (stat cards)
│   │   ├── .label (metric name)
│   │   └── .value (metric value)
│   └── table (detailed data)
└── .ks-drawer__footer
    └── action buttons
```

### Common Metric Labels

| Metric | Chinese Labels |
|--------|---------------|
| 曝光量 | 曝光, 展现, 曝光次数, 展现次数 |
| 点击量 | 点击, 点击量, 点击次数 |
| 播放次数 | 播放, 播放量, 播放次数 |
| 投稿次数 | 投稿, 投稿量, 投稿次数, 发布 |
| GMV | GMV, gmv, 交易额, 成交金额 |
| 预估收益 | 收益, 预估收益, 预计收益, 收入 |
| 转化率 | 转化率, 转化 |
| 点击单价 | 点击单价, CPC |

## Status Values

| Status | Meaning |
|--------|---------|
| 进行中 | Active / In Progress |
| 已结束 | Ended |
| 待开始 | Not Started |
| 已暂停 | Paused |

## Pagination

```
.ks-pagination
├── .ks-pagination__btn-prev (previous button)
├── .ks-pager (page numbers)
│   └── li.number (page number)
└── .ks-pagination__btn-next (next button)
```

### Pagination Selectors

| Element | Selector |
|---------|----------|
| Previous button | `.ks-pagination__btn-prev` |
| Next button | `.ks-pagination__btn-next` |
| Active page | `.ks-pager li.active` |
| Page numbers | `.ks-pager li.number` |

## Common UI Components

### Buttons
```css
/* Primary button */
.ks-button.ks-button--primary

/* Default button */
.ks-button

/* Disabled button */
.ks-button.is-disabled
```

### Dialog/Modal
```css
/* Dialog wrapper */
.ks-dialog__wrapper

/* Dialog */
.ks-dialog

/* Dialog header */
.ks-dialog__header

/* Dialog body */
.ks-dialog__body

/* Dialog footer */
.ks-dialog__footer

/* Close button */
.ks-dialog__close
```

### Form Elements
```css
/* Input */
.ks-input__inner

/* Textarea */
.ks-textarea__inner

/* Select */
.ks-select

/* Date picker */
.ks-date-picker
.ks-range-input
```

## Task Create/Edit Page
URL Pattern: `https://daren.kuaishou.com/distribution-plan-create/*`

### Form Sections
1. Basic Info (基本信息)
   - Task name input: `input[placeholder*="任务名称"]`
   
2. Resource Config (推广资源)
   - Resource table
   - Edit button: `button:has-text("编辑")`
   
3. Resource Dialog
   - Resource name input
   - Resource path input: `input[value*="pages/"]`
   - AI Generate button: `button:has-text("AI生成")`
   - Confirm button: `button:has-text("确认")`

4. Date Range
   - Date picker: `.ks-range-input`
   - Today: `td.available.today`
   - Available dates: `td.available`
   - Next year: `.sys-icon-double-arrow-right`

5. Submit
   - Submit button: `button:has-text("提交")` or `button:has-text("发布")`
   - Next step: `button:has-text("下一步")`

## Network API Endpoints

Common XHR endpoints observed:
```
GET /rest/v1/distribution/plan/list
GET /rest/v1/distribution/plan/detail/{planId}
GET /rest/v1/distribution/plan/stats/{planId}
POST /rest/v1/distribution/plan/create
POST /rest/v1/distribution/plan/update
```

## Debugging Tips

### Get element info
```javascript
// Get all buttons with their text
Array.from(document.querySelectorAll('button')).map(b => ({
  text: b.textContent.trim(),
  class: b.className,
  disabled: b.disabled
}))

// Get computed styles
window.getComputedStyle(element)

// Check visibility
const style = window.getComputedStyle(element);
const isVisible = style.display !== 'none' && 
                  style.visibility !== 'hidden' && 
                  style.opacity !== '0';
```

### Wait for element
```javascript
// Poll for element
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        resolve(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(timer);
        reject(new Error('Timeout'));
      }
    }, 100);
  });
}
```
