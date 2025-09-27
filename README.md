# LetMeTryAI

A modern, responsive web application featuring interactive content and games.

## 🚀 Features

- **Interactive Fireworks**: Canvas-based particle animation system
- **Survey/Quiz System**: Dynamic questionnaire with data visualization
- **Responsive Design**: Mobile-first approach with progressive enhancement
- **Centralized Configuration**: Unified API and resource management
- **Modular Architecture**: Well-organized, maintainable codebase

## 📋 Project Structure

```
LetMeTryAI/
├── util/                    # Utility modules
│   ├── config.js           # Centralized configuration (ES modules)
│   ├── ai_utils.js         # AI integration utilities
│   ├── file-util.js        # File management utilities
│   └── mysql-util.js       # Database utilities
├── howlong/                # Survey component
│   ├── index.html          # Survey page markup
│   ├── app.js             # Survey logic and interactions
│   └── styles.css         # Component-specific styles
├── webview*/              # Various content pages
├── config.js              # Global configuration (for HTML usage)
├── util.js                # Legacy utility functions
├── firework.js            # Firework animation system
├── main.js                # Main application logic
├── styles.css             # Global styles
└── index.html             # Application entry point
```

## 🛠️ Development

### Prerequisites

- Node.js (v16 or higher)
- Modern web browser
- Python 3 (for local server)

### Installation

```bash
# Clone the repository
git clone https://github.com/jackandking/LetMeTryAI.git
cd LetMeTryAI

# Install dependencies
npm install
```

### Development Commands

```bash
# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Lint code
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Run quality checks (lint + test)
npm run quality

# Start local development server
npm run serve
```

### Code Quality Standards

This project enforces code quality through:

- **ESLint**: JavaScript linting with custom rules
- **Prettier**: Consistent code formatting
- **Jest**: Comprehensive testing framework
- **JSDoc**: Required documentation for all public functions

### Testing

The project includes comprehensive tests:

- **Unit Tests**: Individual function testing
- **Integration Tests**: Cross-module functionality
- **Regression Tests**: Backward compatibility verification
- **Configuration Tests**: System configuration validation

Run specific test suites:

```bash
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:regression  # Regression tests
npm run test:config      # Configuration tests
```

## 🏗️ Architecture

### Configuration Management

The application uses a centralized configuration system:

- `util/config.js`: ES module exports for modern JavaScript
- `config.js`: Global window properties for HTML script tags
- Consistent API endpoints and resource URLs across all modules

### Component Structure

Each major component follows a consistent pattern:

1. **HTML**: Semantic markup with minimal inline code
2. **JavaScript**: Modular, well-documented logic in separate files  
3. **CSS**: Component-specific styles with responsive design

### Error Handling

All functions include comprehensive error handling:

- Input validation with meaningful error messages
- Graceful fallbacks for network requests
- Detailed logging for debugging

### Performance Optimizations

- Lazy loading of images with fallbacks
- Efficient canvas animation loops
- Minimized DOM manipulations
- CSS transitions for smooth interactions

## 🎨 Styling Guidelines

### CSS Organization

Styles are organized using a systematic approach:

```css
/* Component styles follow this structure */
/* Base Styles */
/* Layout */  
/* Components */
/* Responsive Design */
/* Accessibility */
```

### Responsive Design

The application uses a mobile-first approach:

- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px  
- **Desktop**: 1024px - 1199px
- **Large Desktop**: 1200px+

### Accessibility

All components include accessibility features:

- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Reduced motion preferences

## 🔧 API Integration

### Configuration API

The application integrates with external APIs:

```javascript
// Centralized endpoints
const API_ENDPOINTS = {
    AI_CHAT: `${BASE_URL}/lws/ai/chat`,
    FILE_UPLOAD: `${BASE_URL}/lws/file/upload`,
    MYSQL_QUERY: `${BASE_URL}/lws/mysql/query`
    // ... more endpoints
};
```

### Key-Value Storage

Persistent data storage through AWS Lambda:

```javascript
// Store data
await updateKeyValueStore(key, value, sortKey, expireAt);

// Retrieve data  
readKeyValueStore(key, callback, sortKey);
```

## 📱 Mini-Program Integration

The application integrates with Kuaishou (KS) mini-program APIs:

- Navigation control
- Advertisement display
- User interaction tracking

## 🚀 Deployment

### Production Build

The application is ready for deployment:

1. All assets are optimized
2. Error handling is comprehensive
3. Fallbacks are implemented for all external resources

### Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## 🤝 Contributing

### Code Style

- Follow ESLint configuration
- Use Prettier for formatting
- Write comprehensive JSDoc comments
- Include tests for new functionality

### Pull Request Process

1. Run quality checks: `npm run quality`
2. Ensure all tests pass
3. Update documentation as needed
4. Follow conventional commit messages

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Live Demo](https://letmetryai.cn)
- [Documentation](./TESTING.md)
- [Contributing Guidelines](./copilot-instructions.md)
