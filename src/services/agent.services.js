const { agentHeader } = require("../config/config")
const Groq = require("./groq.services")
const { parentPort, workerData } = require("worker_threads")
const { URL } = require("url");
const { HttpsProxyAgent } = require("https-proxy-agent");
const chalk = require("chalk");
const { timestamp } = require("../utils/timestamp");
require("dotenv").config()

global.URL = URL;

const prompt = [
    "What is the difference between a blockchain and a traditional database?",
    "How does a blockchain ensure data integrity and immutability?",
    "What are the key components of a blockchain network?",
    "What is the role of consensus algorithms like Proof of Work or Proof of Stake?",
    "How do smart contracts work on Ethereum?",
    "What are gas fees in Ethereum and why do they fluctuate?",
    "What is a blockchain wallet and how does it work?",
    "What are the differences between custodial and non-custodial wallets?",
    "What is a token and how is it different from a coin?",
    "What is the purpose of a whitepaper in a crypto project?",
    "How do decentralized exchanges (DEXs) work?",
    "What are the risks of investing in cryptocurrencies?",
    "What is the difference between Layer 1 and Layer 2 blockchains?",
    "What is a hard fork in blockchain technology?",
    "How do NFTs work and what makes them unique?",
    "What is DeFi (Decentralized Finance) and how does it work?",
    "What is staking in crypto and how can users earn rewards?",
    "What is a blockchain oracle and why is it important?",
    "How do crypto mining and transaction validation work?",
    "What are the most common use cases for blockchain technology outside of cryptocurrency?"
];


const chatHistory = []
class Agent {
    static async sendQuestion() {
        const { walletAddress, proxy } = workerData

        const url = new URL("https://deployment-kazqlqgrjw8hbr8blptnpmtj.staging.gokite.ai/main")
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        chatHistory.push({
            role: "user",
            content: "ask something about crypto"
        })

        let cycle = 0
        let maxCycle = 20

        const groq_api_key = process.env.groq_api_key

        while (cycle < maxCycle) {
            try {
                const randomIndex = Math.floor(Math.random() * prompt.length)
                const question = groq_api_key ? await Groq.getQuestion(chatHistory) : prompt[randomIndex]
                console.log(`${timestamp()} ${chalk.yellowBright(`${walletAddress} TRYING TO SEND QUESTION`)}`)

                const startTime = Date.now()
                let firstTokenTime = null

                const response = await fetch(url, {
                    method: "POST",
                    headers: agentHeader,
                    agent,
                    body: JSON.stringify({
                        message: question,
                        stream: true
                    })
                })

                if (!response.ok || !response.body) {
                    parentPort.postMessage({
                        type: "failed",
                        data: chalk.redBright(`❗ ${walletAddress} FAILED INTERACTING WITH AGENT`)
                    })
                }

                const reader = response.body.getReader()
                const decoder = new TextDecoder()

                let agentResponse = ""

                while (true) {
                    const { done, value } = await reader.read()
                    const chunkTime = Date.now()

                    if (done) {
                        break
                    }
                    const chunk = decoder.decode(value, { stream: true })

                    if (!firstTokenTime && chunk.trim().length > 0) {
                        firstTokenTime = chunkTime
                    }

                    const lines = chunk.split("\n").filter(line => line.trim() !== "")

                    for (const line of lines) {
                        try {
                            if (line.startsWith("data:")) {
                                const json_string = line.slice(5).trim()

                                if (json_string === "[DONE]") {
                                    break
                                }

                                const parsed = JSON.parse(json_string)
                                const content = parsed.choices[0]?.delta.content

                                if (content === "null" || content === null) {
                                    break
                                }

                                agentResponse += `${content}`
                            }
                        } catch (error) {
                            parentPort.postMessage({
                                type: "error",
                                data: chalk.redBright(`❗ ${walletAddress} FAILED PARSING AGENT RESPONSE`)
                            })
                            return
                        }
                    }
                }

                const endTime = Date.now()
                const total_time = endTime - startTime
                const ttft = firstTokenTime ? firstTokenTime - startTime : 0

                await this.reportUsage(walletAddress, question, agentResponse, total_time, ttft, proxy)
                parentPort.postMessage({
                    type: "done",
                    data: {
                        address: walletAddress
                    }
                })
            } catch (error) {
                parentPort.postMessage({
                    type: "error",
                    data: error
                })
            }

            cycle++
            console.log(`${timestamp()} ${chalk.cyanBright(`${walletAddress} PASSED ${cycle} CYCLE`)}`)
            await new Promise(resolve => setTimeout(resolve, 20000))
        }

        console.log(`${timestamp()} ${chalk.cyanBright(`${walletAddress} SUCCESSFULLY FINISHED ${cycle} CYCLE`)}`)
    }

    static async reportUsage(address, question, response, total_time, ttft, proxy) {
        const url = new URL("https://quests-usage-dev.prod.zettablock.com/api/report_usage")
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        console.log(`${timestamp()} ${chalk.yellowBright(`${address} REPORTING USAGE`)}`)

        let success = false
        let attempt = 0
        let maxAttempt = 3

        while (!success && attempt < maxAttempt) {
            try {
                const responses = await fetch(url, {
                    method: "POST",
                    headers: agentHeader,
                    agent,
                    body: JSON.stringify({
                        agent_id: "deployment_JtmpnULoMfudGPRhHjTWQlS7",
                        request_metada: {},
                        request_text: question,
                        response_text: response,
                        wallet_address: address,
                        total_time: total_time,
                        ttft: ttft,
                        walletAddress: address
                    })
                })

                const result = await responses.json()

                const message = "Usage report successfully recorded"
                if (result.message !== message) {
                    console.log(`${timestamp} ${chalk.redBright(`❗ ${address} FAILED RECORDING USAGE`)}`)
                    await new Promise(resolve => setTimeout(resolve, 15000))
                    continue
                }

                success = true
                console.log(`${timestamp()} ${chalk.greenBright(`${address} SUCCESSFULLY RECORDED USAGE`)}`)
            } catch (error) {
                console.error(chalk.redBright(error))
            }

            attempt++
        }
    }
}

module.exports = Agent