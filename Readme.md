<div align="center">

```
██████╗ ██╗   ██╗███████╗████████╗███████╗███████╗
██╔══██╗██║   ██║██╔════╝╚══██╔══╝██╔════╝██╔════╝
██████╔╝██║   ██║███████╗   ██║   █████╗  ███████╗
██╔══██╗██║   ██║╚════██║   ██║   ██╔══╝  ╚════██║
██║  ██║╚██████╔╝███████║   ██║   ██║     ███████║
╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝     ╚══════╝
          Q U O T A   M A N A G E R
```

**A slick, interactive CLI tool to manage storage quotas on your [RustFS](https://rustfs.com) buckets.**  
No bloated SDK. No GUI required. Just your terminal.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![RustFS](https://img.shields.io/badge/Compatible-RustFS-orange?style=flat-square)](https://rustfs.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/frdevelopers/rustfs-quota-manager/pulls)

</div>

---

## ✨ What It Does

Managing bucket quotas in RustFS shouldn't require memorizing admin API paths or wrestling with misconfigured CLI tools.  
**rustfs-quota-manager** gives you a clean, guided terminal experience:

- 📋 **Auto-discovers** all your buckets — no typing bucket names blind
- 💾 **Set HARD quotas** in MB with human-readable size feedback
- ✅ **Confirm before applying** — no accidental overwrites
- 🔐 **Pure Node.js** — no external dependencies, AWS SDK not required
- 🎨 **Color-coded terminal UI** — because life's too short for ugly CLIs

---

## 🖥️ Demo

```
  ╔══════════════════════════════════════════════════╗
  ║        RustFS Bucket Quota Manager  v1.0         ║
  ╚══════════════════════════════════════════════════╝
  Endpoint: http://192.168.33.147:9000
  ────────────────────────────────────────────────────

  Fetching buckets from endpoint... done

  Available Buckets:
    1. production-assets
    2. test-bucket
    3. Enter bucket name manually

  Select bucket [1-3]: 2

  ────────────────────────────────────────────────────

  Set Quota for: test-bucket

  ℹ  Enter quota size in MB  (e.g. 1024 = 1 GB, 10240 = 10 GB)

  Quota size (MB): 2048

  ────────────────────────────────────────────────────

  Summary:
    Bucket  : test-bucket
    Quota   : 2048 MB (2.00 GB)
    Type    : HARD

  Apply this quota? [y/n]: y

  ✔  Quota applied successfully!
    Bucket : test-bucket
    Quota  : 2.00 GB (HARD)
```

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- A running RustFS instance
- Admin credentials for your RustFS server

### Installation

```bash
# Clone the repo
git clone https://github.com/frdevelopers/rustfs-quota-manager.git
cd rustfs-quota-manager
```

No `npm install` needed — zero external dependencies. 🎉

### Configuration

Open `rustfs-quota-manager.js` and update the config block at the top:

```js
const config = {
    endpoint:        'http://YOUR_RUSTFS_HOST:9000',  // RustFS server URL
    accessKeyId:     'YOUR_ACCESS_KEY',               // Admin access key
    secretAccessKey: 'YOUR_SECRET_KEY',               // Admin secret key
    region:          'us-east-1',                     // Region (can leave as-is)
};
```

> 💡 **Tip:** You can also use environment variables — see [Environment Variables](#-environment-variables) below.

### Run

```bash
node rustfs-quota-manager.js
```

---

## 🔧 Environment Variables

To avoid hardcoding credentials, export these before running:

```bash
export RUSTFS_ENDPOINT=http://YOUR_RUSTFS_HOST:9000
export RUSTFS_ACCESS_KEY=your-access-key
export RUSTFS_SECRET_KEY=your-secret-key

node rustfs-quota-manager.js
```

> ⚠️ **Never commit credentials to Git.** Add your config file to `.gitignore` if you hardcode values locally.

---

## 📁 Project Structure

```
rustfs-quota-manager/
├── rustfs-quota-manager.js   # Main CLI script
├── README.md                 # You are here
└── LICENSE                   # MIT License
```

---

## 🛠️ How It Works

This tool uses **AWS Signature Version 4** to authenticate directly against the RustFS Admin REST API — the same signing mechanism used by the AWS SDK, but with zero dependencies.

| Step | What happens |
|------|-------------|
| 1 | Fetches bucket list via `GET /` with SigV4 auth |
| 2 | Presents an interactive numbered menu |
| 3 | Accepts quota input in MB, converts to bytes |
| 4 | Sends `PUT /rustfs/admin/v3/quota/{bucket}` with HARD quota payload |
| 5 | Reports success or failure with HTTP status |

---

## 🤝 Contributing

Contributions are welcome! Here are some ideas for improvements:

- [ ] View current quota for a bucket
- [ ] Remove / reset quota
- [ ] Support FIFO quota type
- [ ] Config file support (`~/.rustfs-quota.json`)
- [ ] Batch quota setting from a CSV
- [ ] `--non-interactive` flag for scripting/CI use

To contribute:

```bash
# Fork the repo, then:
git checkout -b feature/my-improvement
# make your changes
git commit -m "feat: add my improvement"
git push origin feature/my-improvement
# Open a Pull Request
```

---

## ⚠️ Known Limitations

- Some `mc admin` commands (like `policy attach`, `user list`) may not be fully supported depending on your RustFS version — this tool works around that by calling the Admin REST API directly.
- Tested against **RustFS** with MinIO-compatible admin API. Behavior may vary on older builds.

---

## 📄 License

MIT © [Muhammad Farhan](https://github.com/frdevelopers)

---

<div align="center">

Built with ☕ and a healthy frustration with misconfigured CLIs.  
If this saved you time, consider giving it a ⭐

</div>
