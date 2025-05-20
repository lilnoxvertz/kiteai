const { ethers } = require('ethers')
const Proxy = require('../services/proxy.services')
const Wallet = require('../services/wallet.services')
const Workers = require('../utils/process.worker')

isRunning = true

const delay = (min, max) => {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min
    const second = ms / 1000
    console.log(`waiting ${second} seconds`)
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function start() {
    let maxWorker = 5
    const interactionTask = []

    const walletArr = await Wallet.loadWalletAddress()
    const proxyArr = await Proxy.load()

    if (walletArr.length === 0) {
        console.log('no private key/wallet address found')
        process.exit(1)
    }

    if (proxyArr.length === 0) {
        console.log("no proxy found. using current ip")
        maxWorker = 2
    }

    try {
        const getProxy = async (proxys, index) => {
            return proxys.length === 0 ? "" : proxyArr[index % proxyArr.length]
        }

        console.clear()
        console.log('[KITEAI BOT | github.com/lilnoxvertz]')
        console.log(`[LOADED ${walletArr.length} WALLET]`)
        console.log(`[LOADED ${proxyArr.length} PROXY]`)

        for (let i = 0; i < walletArr.length; i++) {
            const proxy = await getProxy(proxyArr, i)
            interactionTask.push(() => Workers.agentWorker(walletArr[i], proxy))
        }

        console.log('\n[SENDING QUESTION]')
        await Workers.limitTasks(interactionTask, maxWorker)
    } catch (error) {
        console.error(error)
    }
}

start()
