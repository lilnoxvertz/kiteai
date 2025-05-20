const { ethers } = require("ethers")
const fs = require("fs")

class Wallet {
    static async generate(amount) {
        let i = 0
        try {
            while (i < amount) {
                const wallet = ethers.Wallet.createRandom()
                fs.appendFileSync("private_key.txt", `${wallet.privateKey},${wallet.address}\n`, { flag: "a" })
                i++
            }

            console.clear()
            console.log(`successfully generated ${amount} wallet`)
        } catch (error) {
            console.error(error)
        }
    }

    static async loadPrivatekey() {
        try {
            return fs.readFileSync("private_key.txt", "utf8")
                .split("\n")
                .filter((line) => line.trim())
                .map((address) => address.split(",")[0])
        } catch (error) {
            console.error(error)
        }
    }

    static async loadWalletAddress() {
        try {
            return fs.readFileSync("address.txt", "utf8")
                .split("\n")
                .filter((line) => line.trim())
                .map((address) => address.trim())
        } catch (error) {
            console.error(error)
        }
    }

    static async sign(wallet, authTicket) {
        try {
            const signature = await wallet.signMessage(authTicket)
            return signature
        } catch (error) {
            console.error(error)
        }
    }
}

module.exports = Wallet