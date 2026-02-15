# 🏥 MedAlert

MedAlert is a healthcare monitoring and alert system designed to detect critical conditions and trigger real-time notifications for timely intervention.

---

## 🚀 Overview

MedAlert analyzes incoming health parameters against predefined threshold values and automatically generates alerts when abnormal conditions are detected. The system focuses on real-time responsiveness and reliable notification delivery.

---

## ✨ Key Features

- 📊 Health parameter monitoring  
- 🚨 Automated alert triggering using Twilio (SMS notifications)  
- ⚡ Real-time condition evaluation  
- 🧩 Modular backend architecture  
- 📈 Clean and responsive user interface  

---

## 🛠 Tech Stack

### 💻 Frontend
- React.js  

### ⚙️ Backend
- Node.js  
- Express.js  
- REST API architecture  

### 🔔 Communication
- Twilio API for SMS alert notifications  

---

## 🧠 How It Works

1. User inputs or system receives health parameters.
2. Backend logic evaluates values against defined medical thresholds.
3. If abnormal conditions are detected, the Twilio API is triggered.
4. Instant SMS alerts are sent to the registered contact number.

---

## 📦 Installation

```bash
git clone https://github.com/your-username/medalert.git
cd medalert
npm install
npm start
