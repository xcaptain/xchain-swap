<script lang="ts">
    import { onMount } from "svelte";
    import { estimateSwap } from "$lib/estimateSwap";
    // 导入ethers
    import { ethers } from "ethers";
    import { Wallet } from "@xchainjs/xchain-wallet";
    import { Network } from "@xchainjs/xchain-client";
    import { doSingleSwap } from "$lib/doSwap";
    import { Client as EthClient, defaultEthParams } from "@xchainjs/xchain-ethereum";

    let sourceAmount = $state(0);
    let estimatedReceived = $state("");
    let fee = $state("");
    let sourceAsset = "ETH.ETH";
    let destinationAsset = $state("BSC.BNB");
    let assets = [
        "BTC.BTC",
        "ETH.ETH",
        "BSC.BNB",
        "ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7",
    ];
    let estimating = $state(false);

    // 钱包状态
    let walletConnected = $state(false);
    let walletAddress = $state("");
    let walletBalance = $state("");
    let connecting = $state(false);

    // 收款地址
    let destinationAddress = $state("");

    // 格式化资产名称，过长则截断并添加省略号
    function formatAssetName(assetName: string, maxLength = 12) {
        if (assetName.length <= maxLength) return assetName;

        // 查找最后一个分隔符的位置
        const lastSeparator = assetName.lastIndexOf("-");

        if (lastSeparator !== -1 && lastSeparator > 0) {
            // 分割成前缀和合约地址部分
            const prefix = assetName.substring(0, lastSeparator);
            const contractPart = assetName.substring(lastSeparator + 1);

            // 如果合约地址太长，则截断
            if (contractPart.length > 8) {
                return `${prefix}-${contractPart.substring(0, 6)}...`;
            }
        }

        // 如果没有分隔符或其他情况，直接截断
        return assetName.substring(0, maxLength - 3) + "...";
    }

    // 获取资产的简短名称（用于显示）
    function getAssetShortName(asset: string) {
        // 获取资产标识符最后一部分
        const parts = asset.split(".");
        if (parts.length > 1) {
            const lastPart = parts[1];
            // 如果有合约地址，拆分并取前面部分
            if (lastPart.includes("-")) {
                return lastPart.split("-")[0];
            }
            return lastPart;
        }
        return asset;
    }

    // 连接MetaMask钱包
    async function connectWallet() {
        if (!window.ethereum) {
            alert("请安装MetaMask钱包");
            return;
        }

        connecting = true;

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);

            // 请求用户连接钱包
            const accounts = await provider.send("eth_requestAccounts", []);

            // 尝试切换到以太坊主网
            try {
                // 切换到以太坊主网 (chain ID: 1)
                await provider.send("wallet_switchEthereumChain", [
                    { chainId: "0x1" },
                ]);
                console.log("已切换到以太坊主网");
            } catch (switchError) {
                // 如果用户拒绝切换或发生其他错误
                console.error("切换网络失败:", switchError);
                alert("请切换到以太坊主网后再试");
                connecting = false;
                return;
            }

            if (accounts.length > 0) {
                walletAddress = accounts[0];
                walletConnected = true;

                // 获取ETH余额
                const balance = await provider.getBalance(walletAddress);
                walletBalance = ethers.utils.formatEther(balance);

                console.log("钱包已连接:", walletAddress);
                console.log("ETH余额:", walletBalance);
            }
        } catch (error) {
            console.error("连接钱包失败:", error);
            alert("连接钱包失败");
        } finally {
            connecting = false;
        }
    }

    // 简化钱包地址显示格式 (0x1234...5678)
    function formatAddress(address: string) {
        if (!address) return "";
        return (
            address.substring(0, 6) +
            "..." +
            address.substring(address.length - 4)
        );
    }

    const estimateTransaction = async () => {
        if (!sourceAmount) return;

        estimating = true;

        const result = await estimateSwap(
            sourceAmount,
            18,
            sourceAsset,
            destinationAsset,
            destinationAddress ||
                walletAddress ||
                "0x7e727520B29773e7F23a8665649197aAf064CeF1",
        );
        console.log("swap result:", result);

        if (result) {
            fee =
                result.txEstimate.totalFees.outboundFee.assetAmountFixedString();
            estimatedReceived =
                result.txEstimate.netOutput.assetAmountFixedString();
        }

        estimating = false;
    };

    function getExchangeRate() {
        // 模拟汇率，实际应从API获取
        const rates = {
            "ETH-BTC": 0.06,
            "ETH-BSC": 1.002,
            "ETH-ETH": 1,
        };
        return rates[`${sourceAsset}-${destinationAsset}`] || 1;
    }

    function handleSourceAmountChange() {
        fee = "";
        estimatedReceived = "";
    }

    // 默认使用当前钱包作为目标地址
    function useCurrentWalletAsDestination() {
        if (walletConnected) {
            destinationAddress = walletAddress;
        }
    }

    // 清除目标地址
    function clearDestinationAddress() {
        destinationAddress = "";
    }

    async function handleSwap() {
        if (!walletConnected) {
            alert("请先连接钱包");
            return;
        }

        if (!sourceAmount || !destinationAddress) {
            alert("请输入金额和目标地址");
            return;
        }

        // 这里可以添加实际的交换逻辑
        console.log("开始交换:", {
            sourceAmount,
            sourceAsset,
            destinationAsset,
            destinationAddress,
        });

        // 创建与v5兼容的provider和signer
        const provider = new ethers.providers.Web3Provider(window.ethereum);

        // const { Client: EthClient } = await import('@xchainjs/xchain-ethereum');

        // 使用默认的ETH参数创建EthClient
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

        await doSingleSwap(
            wallet,
            destinationAddress,
            sourceAmount,
            18,
            sourceAsset,
            destinationAsset,
        );
    }
</script>

<div class="container mx-auto p-4 max-w-3xl relative">
    <!-- 钱包连接按钮 -->
    <div class="absolute top-0 right-0">
        {#if !walletConnected}
            <button
                onclick={connectWallet}
                class="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                disabled={connecting}
            >
                {#if connecting}
                    <span class="inline-block animate-spin">⟳</span>
                    连接中...
                {:else}
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        ></path>
                    </svg>
                    连接钱包
                {/if}
            </button>
        {:else}
            <div
                class="flex items-center gap-3 bg-gray-100 py-2 px-4 rounded-lg"
            >
                <div class="flex flex-col">
                    <span class="text-sm text-gray-600">钱包地址</span>
                    <span class="font-medium"
                        >{formatAddress(walletAddress)}</span
                    >
                </div>
                <div class="w-px h-8 bg-gray-300"></div>
                <div class="flex flex-col">
                    <span class="text-sm text-gray-600">ETH余额</span>
                    <span class="font-medium"
                        >{parseFloat(walletBalance).toFixed(4)}</span
                    >
                </div>
            </div>
        {/if}
    </div>

    <h1 class="text-2xl font-bold text-center mb-6 pt-14">
        THORChain 跨链资产转换
    </h1>

    <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex flex-col gap-6">
            <!-- 资产转换区域 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- 源资产 -->
                <div class="p-4 bg-gray-50 rounded-lg">
                    <div class="flex justify-between mb-2">
                        <span class="text-gray-600">从</span>
                        <span class="text-gray-600"
                            >ETH 余额: {walletConnected
                                ? parseFloat(walletBalance).toFixed(4)
                                : "0.00"}</span
                        >
                    </div>

                    <!-- 显示当前钱包地址 -->
                    {#if walletConnected}
                        <div
                            class="mb-3 bg-blue-50 rounded-md py-1 px-2 flex items-center justify-between"
                        >
                            <div class="flex items-center">
                                <svg
                                    class="w-4 h-4 text-blue-500 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    ></path>
                                </svg>
                                <span class="text-xs text-blue-700 font-medium"
                                    >从账户：{formatAddress(
                                        walletAddress,
                                    )}</span
                                >
                            </div>
                        </div>
                    {/if}

                    <div class="flex items-center gap-2 mb-2">
                        <div class="flex-grow">
                            <input
                                type="number"
                                bind:value={sourceAmount}
                                oninput={handleSourceAmountChange}
                                placeholder="0.0"
                                class="w-full p-2 bg-transparent text-xl focus:outline-none"
                            />
                        </div>
                        <div
                            class="flex items-center gap-2 bg-gray-200 px-3 py-2 rounded-lg"
                        >
                            <span class="font-medium">ETH</span>
                        </div>
                    </div>

                    <div class="text-right text-sm text-gray-500">≈ $0.00</div>
                </div>

                <!-- 目标资产 -->
                <div class="p-4 bg-gray-50 rounded-lg">
                    <div class="flex justify-between mb-2">
                        <span class="text-gray-600">到</span>
                    </div>

                    <!-- 目标地址输入框 -->
                    <div class="mb-3 relative">
                        <div class="flex">
                            <input
                                type="text"
                                bind:value={destinationAddress}
                                placeholder="输入目标钱包地址..."
                                class="w-full text-xs border border-gray-300 rounded-l-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <div class="flex">
                                {#if destinationAddress}
                                    <button
                                        onclick={clearDestinationAddress}
                                        class="bg-gray-200 text-gray-600 hover:bg-gray-300 px-2 text-xs"
                                    >
                                        ✕
                                    </button>
                                {/if}
                                <button
                                    onclick={useCurrentWalletAsDestination}
                                    class="bg-blue-500 text-white hover:bg-blue-600 rounded-r-md px-2 text-xs"
                                    disabled={!walletConnected}
                                >
                                    使用当前钱包
                                </button>
                            </div>
                        </div>
                        {#if destinationAddress}
                            <div
                                class="mt-1 text-xs text-blue-700 flex items-center"
                            >
                                <svg
                                    class="w-3 h-3 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    ></path>
                                </svg>
                                目标地址：{formatAddress(destinationAddress)}
                            </div>
                        {/if}
                    </div>

                    <div class="flex items-center gap-2 mb-2">
                        <div class="flex-grow">
                            <input
                                type="text"
                                value={estimatedReceived}
                                disabled
                                placeholder="0.0"
                                class="w-full p-2 bg-transparent text-xl focus:outline-none"
                            />
                        </div>
                        <div class="relative">
                            <select
                                bind:value={destinationAsset}
                                onchange={handleSourceAmountChange}
                                class="appearance-none bg-gray-200 px-3 py-2 pr-8 rounded-lg focus:outline-none max-w-[140px] truncate"
                                title={destinationAsset}
                            >
                                {#each assets as asset}
                                    <option
                                        value={asset}
                                        title={asset}
                                        class="truncate"
                                    >
                                        {formatAssetName(asset)}
                                    </option>
                                {/each}
                            </select>
                            <div
                                class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"
                            >
                                <svg
                                    class="fill-current h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="text-right text-sm text-gray-500">≈ $0.00</div>
                </div>
            </div>

            <!-- 中间交换图标 -->
            <div class="flex justify-center -my-4">
                <div class="bg-white rounded-full p-2 shadow-md">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                    </svg>
                </div>
            </div>

            <!-- 交易详情 -->
            <div class="bg-gray-50 p-4 rounded-lg mt-4">
                <h3 class="font-medium mb-2">交易详情</h3>

                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600">预估手续费:</span>
                    <span>{fee ? `${fee} ETH` : "-"}</span>
                </div>

                <div class="flex justify-between text-sm">
                    <span class="text-gray-600">预估到账:</span>
                    <span
                        >{estimatedReceived
                            ? `${estimatedReceived} ${getAssetShortName(destinationAsset)}`
                            : "-"}</span
                    >
                </div>
            </div>

            <!-- 按钮 -->
            <button
                class="btn btn-primary w-full py-3 rounded-lg {!sourceAmount ||
                !walletConnected
                    ? 'opacity-50 cursor-not-allowed'
                    : ''}"
                disabled={!sourceAmount || estimating || !walletConnected}
                onclick={estimateTransaction}
            >
                {#if estimating}
                    <span class="inline-block animate-spin mr-2">⟳</span> 计算中...
                {:else if !walletConnected}
                    请先连接钱包
                {:else}
                    {sourceAmount ? "估算费用" : "请输入金额"}
                {/if}
            </button>

            <button class="btn btn-secondary w-full py-3 rounded-lg"
                onclick={handleSwap}>
                确认交换
            </button>
        </div>
    </div>
</div>

<style>
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .animate-spin {
        animation: spin 1s linear infinite;
    }

    .btn-primary {
        background-color: #0075ff;
        color: white;
        font-weight: 500;
        transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
        background-color: #0062d6;
    }

    /* 修复长字符串导致的溢出问题 */
    option {
        max-width: 120px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
