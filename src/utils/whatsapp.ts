import WAWebJS, { Client } from "whatsapp-web.js";

class Whatsapp {

  private client: WAWebJS.Client

  constructor() {
    this.client = new Client({})
  }

  initialize() {
    this.client.initialize()
  }
}