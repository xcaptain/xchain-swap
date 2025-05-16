<script>
    import { onMount } from "svelte";
    import { estimateSwap } from "$lib/estimateSwap";

    let sourceAmount = $state(0);
    let estimatedReceived = $state("");
    let fee = $state("");
    let sourceAsset = "ETH.ETH";
    let destinationAsset = $state("BSC.BNB");
    let assets = ["BTC.BTC", "ETH.ETH", "BSC.BNB"];
    let estimating = $state(false);

    const estimateTransaction = async () => {
        if (!sourceAmount) return;

        estimating = true;

        const result = await estimateSwap(
            sourceAmount,
            18,
            sourceAsset,
            destinationAsset,
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
</script>

<div class="container mx-auto p-4 max-w-3xl">
    <h1 class="text-2xl font-bold text-center mb-6">THORChain 跨链资产转换</h1>

    <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex flex-col gap-6">
            <!-- 资产转换区域 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- 源资产 -->
                <div class="p-4 bg-gray-50 rounded-lg">
                    <div class="flex justify-between mb-2">
                        <span class="text-gray-600">从</span>
                        <span class="text-gray-600">ETH 余额: 0.00</span>
                    </div>

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
                                class="appearance-none bg-gray-200 px-3 py-2 pr-8 rounded-lg focus:outline-none"
                            >
                                {#each assets as asset}
                                    <option value={asset}>{asset}</option>
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
                            ? `${estimatedReceived} ${destinationAsset}`
                            : "-"}</span
                    >
                </div>
            </div>

            <!-- 按钮 -->
            <button
                class="btn btn-primary w-full py-3 rounded-lg {!sourceAmount
                    ? 'opacity-50 cursor-not-allowed'
                    : ''}"
                disabled={!sourceAmount || estimating}
                onclick={estimateTransaction}
            >
                {#if estimating}
                    <span class="inline-block animate-spin mr-2">⟳</span> 计算中...
                {:else}
                    {sourceAmount ? "确认交换" : "请输入金额"}
                {/if}
            </button>
        </div>
    </div>
</div>
