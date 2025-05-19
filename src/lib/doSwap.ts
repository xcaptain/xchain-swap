import { Network } from '@xchainjs/xchain-client'
import { type QuoteSwapParams, ThorchainQuery, type TxDetails } from '@xchainjs/xchain-thorchain-query'
import {
  CryptoAmount,
  assetAmount,
  assetFromString,
  assetToBase,
  assetToString,
  delay,
  isSynthAsset,
  isTradeAsset,
  register9Rheader,
} from '@xchainjs/xchain-util'
import axios from 'axios'
import { ethers } from "ethers";
import {
  Client as EthClient,
  defaultEthParams,
} from "@xchainjs/xchain-ethereum";

register9Rheader(axios)

function printTx(txDetails: TxDetails, input: CryptoAmount) {
  const expanded = {
    memo: txDetails.memo,
    expiry: txDetails.expiry,
    toAddress: txDetails.toAddress,
    txEstimate: {
      input: input.formatedAssetString(),
      totalFees: {
        asset: assetToString(txDetails.txEstimate.totalFees.asset),
        outboundFee: txDetails.txEstimate.totalFees.outboundFee.formatedAssetString(),
        affiliateFee: txDetails.txEstimate.totalFees.affiliateFee.formatedAssetString(),
      },
      slipBasisPoints: txDetails.txEstimate.slipBasisPoints.toFixed(),
      netOutput: txDetails.txEstimate.netOutput.formatedAssetString(),
      outboundDelaySeconds: txDetails.txEstimate.outboundDelaySeconds,
      canSwap: txDetails.txEstimate.canSwap,
      errors: txDetails.txEstimate.errors,
    },
  }
  console.log(expanded)
}

const delayedLog = async (message: string, delayMs: number) => {
  const startTime = new Date().getTime()
  const endTime = startTime + delayMs
  let remainingTime = delayMs

  while (remainingTime > 0) {
    const elapsedMs = delayMs - remainingTime
    const remainingSeconds = Math.ceil(remainingTime / 1000)
    const elapsedSeconds = Math.floor(elapsedMs / 1000)
    const progress = Math.floor((elapsedMs / delayMs) * 100)

    console.log(`${message} (${elapsedSeconds}s/${remainingSeconds}s ${progress}%)`)

    await delay(500)
    remainingTime = endTime - new Date().getTime()
  }

  console.log(`${message} (Done!)`)
}

/**
 * From asset to asset with no Affiliate address on testnet
 */
export const doSingleSwap = async (provider: ethers.providers.Web3Provider, destinationAddress: string, amount: number, decimals: number, fromAssetRaw: string, toAssetRaw: string) => {
  try {
    const { ThorchainAMM } = await import('@xchainjs/xchain-thorchain-amm');
    const { Wallet } = await import('@xchainjs/xchain-wallet');
    const ethClient = new EthClient({
      ...defaultEthParams,
      network: Network.Mainnet,
      providers: {
        [Network.Mainnet]: provider,
        [Network.Stagenet]: provider,
        [Network.Testnet]: provider,
      },
    });
    const wallet = new Wallet({
      ETH: ethClient,
    });
    const tcAmm = new ThorchainAMM(new ThorchainQuery(), wallet)

    const fromAsset = assetFromString(fromAssetRaw)!;
    const toAsset = assetFromString(toAssetRaw)!;

    const swapParams: QuoteSwapParams = {
      fromAsset,
      amount: new CryptoAmount(assetToBase(assetAmount(amount, decimals)), fromAsset),
      destinationAsset: toAsset,
      destinationAddress,
      toleranceBps: 1000, //optional
    }

    const outPutCanSwap = await tcAmm.estimateSwap(swapParams)
    printTx(outPutCanSwap, swapParams.amount)
    if (outPutCanSwap.txEstimate.canSwap) {
      const output = await tcAmm.doSwap(swapParams)
      console.log(
        `Tx hash: ${output.hash},\n Tx url: ${output.url}\n WaitTime: ${outPutCanSwap.txEstimate.outboundDelaySeconds}`,
      )
      console.log('Waiting for transaction to be confirmed...')
      await delayedLog(
        'hash',
        outPutCanSwap.txEstimate.outboundDelaySeconds <= 6
          ? 12000
          : outPutCanSwap.txEstimate.outboundDelaySeconds * 1000,
      )
    }
  } catch (error) {
    console.error(error)
  }
}

// const main = async () => {
//   const seed = process.argv[2]
//   const network = process.argv[3] as Network
//   const wallet = new Wallet({
//     BTC: new BtcClient({ ...defaultBtcParams, phrase: seed, network }),
//     BCH: new BchClient({ ...defaultBchParams, phrase: seed, network }),
//     LTC: new LtcClient({ ...defaultLtcParams, phrase: seed, network }),
//     DOGE: new DogeClient({ ...defaultDogeParams, phrase: seed, network }),
//     ETH: new EthClient({ ...defaultEthParams, phrase: seed, network }),
//     AVAX: new AvaxClient({ ...defaultAvaxParams, phrase: seed, network }),
//     BSC: new BscClient({ ...defaultBscParams, phrase: seed, network }),
//     GAIA: new GaiaClient({ phrase: seed, network }),
//     BNB: new BnbClient({ phrase: seed, network }),
//     THOR: new ThorClient({ ...defaultThorParams, phrase: seed, network }),
//   })
//   const thorchainAmm = new ThorchainAMM(new ThorchainQuery(), wallet)
//   await doSingleSwap(thorchainAmm, wallet)
// }

// main()
//   .then(() => process.exit(0))
//   .catch((err) => console.error(err))
