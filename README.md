nitinNEWbot/
│
├── src/
│   ├── bot.py
│   │
│   ├── core/                # Main logic
│   │   ├── queue.py
│   │   ├── worker.py
│   │   ├── downloader.py
│   │   └── events.py
│   │
│   ├── plugins/             # Commands
│   │   ├── youtube.py
│   │   ├── instagram.py
│   │   ├── tiktok.py
│   │   ├── admin.py
│   │   └── user.py
│   │
│   ├── services/            # External systems
│   │   ├── redis.py
│   │   ├── database.py
│   │   ├── storage.py
│   │   └── ai.py
│   │
│   ├── utils/
│   │   ├── logger.py
│   │   ├── helpers.py
│   │   └── validators.py
│
├── config/
│   ├── config.py
│   └── constants.py
│
├── database/
│   ├── models.py
│   └── migrations/
│
├── docker/
│   └── Dockerfile
│
├── tests/
├── .env
├── requirements.txt
└── README.md
