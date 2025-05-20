const Wallet = require("../services/wallet.services");

async function generateWallet(amount) {
    console.log(`generating ${amount} wallet`)
    await Wallet.generate(amount)
}

generateWallet(5) // change amount here