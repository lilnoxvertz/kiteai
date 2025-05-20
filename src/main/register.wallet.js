const { ethers } = require("ethers");
const Wallet = require("../services/wallet.services");
const KiteAi = require("../services/kiteai.services");
const Proxy = require("../services/proxy.services");

const stats = {
    success: 0,
    failed: 0,
    total: 0
}

const delay = (min, max) => {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min
    const second = ms / 1000
    console.log(`\nwaiting ${second} seconds before registering again`)
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function registerWallet(wallet, proxy) {
    try {
        console.log("[GETTING AUTH TICKET]")
        const authTicket = await KiteAi.getAuthTicket(proxy)

        if (!authTicket) {
            return
        }

        const signature = await Wallet.sign(wallet, authTicket.payload)
        const token = await KiteAi.auth(signature, authTicket.nonce, proxy)

        await KiteAi.completeTutorial(token, proxy)
        await KiteAi.getStatus(wallet.address, token, proxy)
        console.log(`\ncompleted task for : ${wallet.address}`)

        stats.success++
        stats.total++
    } catch (error) {
        stats.failed++
        stats.total++
        console.error(error)
    }
}

async function start() {
    let i = 0
    try {
        const wallets = await Wallet.loadPrivatekey()
        const proxyArr = await Proxy.load()

        if (wallets.length === 0) {
            console.log("no private key found")
            process.exit(1)
        }

        if (proxyArr.length === 0) {
            console.log("no proxy found. using current ip")
            maxWorker = 2
        }

        const getProxy = async (proxys, index) => {
            return proxys.length === 0 ? "" : proxyArr[index % proxyArr.length]
        }


        for (const pk of wallets) {
            const wallet = new ethers.Wallet(pk)

            console.clear()
            console.log("[KITEAI AUTO REGISTER | github.com/lilnoxvertz]\n")
            console.log(`[LOADED ${wallets.length} WALLET]\n`)
            console.log(`[TOTAL ATTEMPT  : ${stats.total}]`)
            console.log(` success        : ${stats.success}`)
            console.log(` failed         : ${stats.failed}\n`)

            const proxy = await getProxy(proxyArr, i)
            await registerWallet(wallet, proxy)

            await delay(10000, 20000)
            i++
        }

        console.log(`done registering ${stats.success} wallet`)
        process.exit(1)
    } catch (error) {
        console.error(error)
    }
}

start()