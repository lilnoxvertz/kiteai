const { Worker } = require("worker_threads")
const path = require("path")
const { timestamp } = require("./timestamp")
const chalk = require("chalk")

class Workers {
    static async agentWorker(walletAddress, proxy) {
        try {
            return new Promise((resolve, reject) => {
                const worker = new Worker(path.resolve(__dirname, "../worker/agent.worker.js"), {
                    workerData: {
                        walletAddress: walletAddress,
                        proxy: proxy
                    }
                })

                worker.on("message", (message) => {
                    if (message.type === "done") {
                        console.log(`${timestamp()} ${chalk.yellowBright(`${message.data.address} SUCCESSFULLY INTERACTING WITH AI`)}`)
                        resolve()
                    }

                    if (message.type === "failed") {
                        console.log(`${timestamp()} ${message.data}`)
                        resolve()
                    }

                    if (message.type === "error") {
                        reject(new Error(message.data))
                    }
                })

                worker.on("error", reject)
                worker.on("exit", (code) => {
                    if (code !== 0) {
                        reject(new Error(`worker stopped`))
                    }
                })
            })
        } catch (error) {
            console.error(error)
        }
    }

    static async usageReportWorker(walletAddress, senderMessage, agentResponse, total_time, ttft, proxy) {
        try {
            return new Promise((resolve, reject) => {
                const worker = new Worker(path.resolve(__dirname, "../worker/report.usage.js"), {
                    workerData: {
                        address: walletAddress,
                        question: senderMessage,
                        response: agentResponse,
                        total_time: total_time,
                        ttft: ttft,
                        proxy: proxy
                    }
                })

                worker.on("message", (message) => {
                    if (message.type === "done") {
                        console.log(`${timestamp()} ${chalk.greenBright(`SUCCESSUFULLY RECORDED USAGE FOR ${walletAddress}`)}`)
                        resolve({
                            success: true,
                            walletAddress: walletAddress
                        })
                    }

                    if (message.type === "failed") {
                        console.log(`${timestamp} ${message.data}`)
                        resolve()
                    }

                    if (message.type === "error") {
                        reject(new Error(message.data))
                    }
                })
                worker.on("error", reject)
                worker.on("exit", code => {
                    if (code !== 0) {
                        reject(new Error("worker stopped"))
                    }
                })
            })
        } catch (error) {
            console.error(error)
        }
    }

    static async limitTasks(tasks, limit) {
        const results = new Array(tasks.length)
        let nextTaskIndex = 0

        async function worker() {
            while (true) {
                const currentIndex = nextTaskIndex++
                if (currentIndex >= tasks.length) break

                try {
                    const result = await tasks[currentIndex]()
                    results[currentIndex] = result
                } catch (error) {
                    results[currentIndex] = { error }
                }
            }
        }

        const workers = Array(Math.min(limit, tasks.length))
            .fill(0)
            .map(() => worker())

        await Promise.all(workers)
        return results
    }

}

module.exports = Workers