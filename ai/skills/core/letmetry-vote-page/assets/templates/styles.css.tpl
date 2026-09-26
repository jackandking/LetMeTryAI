/**
 * Voting Topic Page - {{THEME_NAME}} Theme
 * Card-based layout with {{THEME_NAME}} styling
 */

/* CSS Variables - Theme */
:root {
    --color-primary: {{C_PRIMARY}};
    --color-primary-dark: {{C_PRIMARY_DARK}};
    --color-secondary: {{C_SECONDARY}};
    --color-accent: {{C_ACCENT}};
    --color-bg: {{C_BG}};
    --color-card: #ffffff;
    --color-text: #2a3a4a;
    --color-text-light: #5a6a7a;
    --color-border: {{C_BORDER}};
    --color-success: #28a745;
    --shadow-sm: 0 2px 4px {{C_SHADOW}};
    --shadow-md: 0 4px 12px {{C_SHADOW}};
    --shadow-lg: 0 8px 24px {{C_SHADOW}};
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Reset & Base */
* {
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, var(--color-bg) 0%, {{C_BG2}} 100%);
    color: var(--color-text);
    min-height: 100vh;
    line-height: 1.6;
}

/* Page Title */
body > h1 {
    text-align: center;
    font-size: 28px;
    font-weight: 800;
    color: var(--color-primary);
    padding: 24px 16px 8px;
    margin: 0;
}

body > form,
body > .result,
body > .show-result-btn,
body > .more {
    max-width: 960px;
    margin-left: auto;
    margin-right: auto;
    padding-left: 16px;
    padding-right: 16px;
}

/* Question Section */
.question {
    background: var(--color-card);
    border-radius: var(--radius-lg);
    padding: 28px;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--color-border);
    animation: fadeInUp 0.5s ease-out;
}

#questionText {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text);
    text-align: center;
    margin: 0 0 24px 0;
    line-height: 1.5;
}

/* Options Grid */
.button-group {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
}

label.option {
    position: relative;
    background: var(--color-card);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

label.option:hover {
    border-color: var(--color-secondary);
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
}

label.option:has(input[type="radio"]:checked) {
    border-color: var(--color-primary);
    background: linear-gradient(135deg, {{C_HOVER1}} 0%, {{C_HOVER2}} 100%);
}

label.option input[type="radio"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

label.option img {
    width: 100%;
    height: 120px;
    object-fit: contain;
    background: linear-gradient(135deg, #f0f4f8 0%, #e0e8f0 100%);
    padding: 16px;
    transition: var(--transition);
}

label.option:hover img {
    transform: scale(1.05);
}

label.option span {
    padding: 16px;
    text-align: center;
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text);
}

label.option:has(input[type="radio"]:checked) span {
    color: var(--color-primary);
}

/* Show Result Button */
.show-result-btn {
    margin-top: 28px;
    padding: 14px 32px;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition);
    display: block;
    width: 100%;
    max-width: 280px;
    margin-left: auto;
    margin-right: auto;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.5px;
    box-shadow: var(--shadow-md);
}

.show-result-btn:hover {
    background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

/* Result Section */
.result {
    display: none;
    margin-top: 28px;
    padding: 28px;
    background: var(--color-card);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--color-border);
    animation: fadeInUp 0.5s ease-out;
}

.result h2 {
    text-align: center;
    color: var(--color-primary);
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 700;
}

.result p {
    text-align: center;
    color: var(--color-text-light);
    margin: 0 0 24px 0;
    font-size: 14px;
}

/* Bar Chart */
.bar-chart {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 32px;
    height: 280px;
    margin-top: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--color-border);
}

.bar-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 80px;
}

.bar {
    width: 48px;
    background: linear-gradient(to top, var(--color-primary), var(--color-secondary));
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--shadow-sm);
}

.bar-label {
    margin-top: 10px;
    font-size: 16px;
    font-weight: 700;
    color: var(--color-primary);
}

.option-label {
    margin-top: 4px;
    font-size: 13px;
    color: var(--color-text-light);
    text-align: center;
    line-height: 1.3;
    font-weight: 500;
}

/* More Section */
.more {
    display: block;
    margin-top: 28px;
    padding: 16px;
    background: var(--color-card);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--color-border);
    cursor: pointer;
    text-align: center;
    transition: var(--transition);
}

.more a {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 600;
    font-size: 15px;
    display: block;
}

.more:hover {
    border-color: var(--color-secondary);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}

/* Animations */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive Design */
@media (max-width: 768px) {
    body > h1 {
        font-size: 22px;
        padding: 16px 12px 8px;
    }

    body > form,
    body > .result,
    body > .show-result-btn,
    body > .more {
        padding-left: 12px;
        padding-right: 12px;
    }

    #questionText {
        font-size: 16px;
        margin-bottom: 20px;
    }

    .button-group {
        grid-template-columns: 1fr;
        gap: 12px;
    }

    label.option {
        flex-direction: row;
        align-items: center;
    }

    label.option img {
        width: 120px;
        height: 120px;
        flex-shrink: 0;
    }

    label.option span {
        text-align: left;
        flex: 1;
    }

    .bar-chart {
        gap: 16px;
        height: 220px;
    }

    .bar-container {
        width: 60px;
    }

    .bar {
        width: 36px;
    }

    .result {
        padding: 20px;
    }
}

@media (max-width: 480px) {
    body > h1 {
        font-size: 20px;
    }

    label.option img {
        width: 100px;
        height: 100px;
    }
}