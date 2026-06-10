import { app } from 'nitron'

app.init({
  name: "Dice Duel App",
  packageId: "com.artcodex.app",
  version: "1.0.0",
  entry: "index.html",
  orientation: "portrait",
  statusBar: true,
  permissions: ["INTERNET"]
})
