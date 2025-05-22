const { HttpsProxyAgent } = require("https-proxy-agent")
const { header } = require("../config/config")
const chalk = require("chalk")
const { timestamp } = require("../utils/timestamp")

class KiteAi {
    static async getAuthTicket(proxy) {
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const nonce = `timestamp_${Date.now()}`

        console.log("[GETTING AUTH TOKEN]")
        const url = "https://api-kiteai.bonusblock.io/api/auth/get-auth-ticket"
        const headers = header

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                agent,
                body: JSON.stringify({
                    nonce: nonce
                })
            })

            if (!response.ok) {
                throw new Error(await response.text())
            }

            const result = await response.text()
            const data = await JSON.parse(result)

            return {
                nonce: nonce,
                payload: data.payload
            }
        } catch (error) {
            console.error(error)
        }
    }

    static async auth(signature, nonce, proxy) {
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const url = "https://api-kiteai.bonusblock.io/api/auth/eth"

        console.log("[AUTHENTICATING]")
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: header,
                agent,
                body: JSON.stringify({
                    blockchainName: "ethereum",
                    nonce: nonce,
                    referralId: "optionalReferral",
                    signedMessage: signature
                })
            })

            if (!response.ok) {
                throw new Error(await response.text())
            }

            const result = await response.text()
            const data = await JSON.parse(result)
            const token = data.payload.session.token

            return token
        } catch (error) {
            console.error(error)
        }
    }

    static async completeTutorial(authToken, proxy) {
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        try {
            const url = "https://api-kiteai.bonusblock.io/api/forward-link/go/kiteai-mission-tutorial-1"

            const headers = {
                ...header,
                "X-Auth-Token": authToken
            }

            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                agent
            })

            const result = await response.json()
            return result.success
        } catch (error) {
            console.error(error)
        }
    }

    static async getStatus(address, authToken, proxy) {
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const url = "https://api-kiteai.bonusblock.io/api/kite-ai/get-status"

        const headers = {
            ...header,
            "X-Auth-Token": authToken
        }

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: headers,
                agent
            })

            if (!response.ok) {
                throw new Error(await response.text())
            }

            const result = await response.text()
            const parsedResult = await JSON.parse(result)
            const userXp = await parsedResult?.payload?.userXp

            console.log(`${timestamp()} [${address}]`)
            console.log(chalk.yellowBright(`XP: ${userXp}\n`))
        } catch (error) {
            console.error(error)
        }
    }
}

module.exports = KiteAi