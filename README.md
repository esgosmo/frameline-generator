# 🎬 Frameline Generator Tool

> A professional, browser-based tool to generate custom aspect ratio overlays and framelines for filmmakers, editors, and DITs.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-blue)
![Tests](https://img.shields.io/badge/Tests-11%20Passing-brightgreen)


## 📖 Overview

**Frameline Generator** creates accurate, high-resolution PNG overlays for NLEs (Premiere Pro, DaVinci Resolve, Avid) or on-set monitoring.

All image processing happens locally in the browser—no data is ever uploaded to a server.

**🔗 Live Demo:** [https://frameline-generator.com](https://frameline-generator.com)
**🔗 Screenshot:** (https://frameline-generator.com/screenshot.png)

## ✨ Key Features

### 🛠 Core Functionality
- **Custom Resolutions:** Presets for HD, UHD, DCI 2K/4K, Cameras and fully custom dimensions.
- **Aspect Ratios:** Standard cinema ratios (2.39, 1.85, 4:3), social media crops (9:16, 4:5) and Camera sensor ratios.
- **Secondary Framelines:** Visualize two aspect ratios simultaneously (e.g., shoot for 16:9, protect for 9:16).
- **Safe Areas:** Toggle Action Safe (93%) and Title Safe (90%).

### 🚀 Performance & Mobile Safety
- **Smart Mobile Logic:** Automatically detects mobile devices to prevent canvas crashes.
- **Optimization:** Supports images up to **6000px** on mobile by auto-resizing internally, while strictly blocking unsafe dimensions (>15K) to prevent memory leaks.
- **Auto-Thickness:** Intelligent line thickness adjustment based on resolution (automatically switches from 2px to 6px for high-res files).

### ♿ Accessibility (A11y)
- **Keyboard Navigation:** Full support for `TAB` navigation and `ENTER`/`SPACE` interactions.
- **Screen Readers:** Semantic HTML and ARIA labels for all interactive elements (upload zones, icon buttons).
- **Focus States:** High-contrast focus indicators for non-mouse users.

### 🔒 Privacy First
- **Client-Side Processing:** Images are processed using the HTML5 Canvas API.
- **No Server Uploads:** Your footage never leaves your device.

## 💻 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+).
- **Testing:** Cypress (E2E & Visual Regression Testing).
- **Libraries:** `UTIF.js` (for TIFF support).

## 🧪 Testing Strategy

This project maintains a robust **Automated Testing Suite** using Cypress to ensure stability across updates.

The suite currently includes **11 E2E Tests** covering:
- ✅ Canvas Dimension Logic & Math.
- ✅ Mobile Security Limits & Crash Prevention.
- ✅ File Uploads (JPG/PNG/TIFF).
- ✅ UI Interaction & Reset Functionality.
- ✅ **Keyboard Accessibility Audit.**



🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.


📄 License
Distributed under the MIT License.