/**
 * AppexQuant Markets Global - Institutional Academy & Trader Development System
 * 100% Original Structured Learning Curriculum & State Managers
 */

import { TraderLevelCategory, GlossaryTerm, UserEducationProgress } from '../../types/education.ts';

export const TRADER_LEVELS: TraderLevelCategory[] = [
  {
    level: 1,
    title: 'Beginner Training',
    subtitle: 'Core Financial Markets & Order Execution',
    description: 'Establish a solid foundation of currency pairs, pips, leverage, order execution, basic candlesticks, and structural support/resistance.',
    badgeName: 'Academy Novice',
    courses: [
      {
        id: 'c1',
        levelId: 1,
        title: 'Forex & Market Fundamentals',
        description: 'Master the mechanical core of global financial exchange, pricing systems, and execution types.',
        modules: [
          {
            id: 'm1',
            courseId: 'c1',
            title: 'Foundations of Global Currency Exchange',
            description: 'Dive into exchange mechanisms, currency pairing, spreads, lots, and leverage.',
            missionBriefing: {
              objective: 'Understand how global currency pairs are valued, bid/ask mechanisms, and margin allocation rules.',
              recognitionTarget: 'Spot base and quote currency relationships, identify pip valuation, and choose appropriate leverage ratios.',
              marketConditions: 'Continuous 24/5 global interbank market cycles across London, New York, and Tokyo sessions.',
              prerequisites: 'None. Complete beginner status required.',
              practiceRequirement: 'Complete spread calculations and lot size calibrations using the interactive risk terminal.',
              masteryStandard: 'Attain a 100% score on the Level 1 module quiz.'
            },
            lessons: [
              {
                id: 'l1-1',
                levelId: 1,
                courseId: 'c1',
                moduleId: 'm1',
                title: 'Market Fundamentals & Currency Pairs',
                description: 'Understand Base/Quote pairings and the fundamentals of financial asset valuation.',
                difficulty: 'Beginner',
                estimatedMinutes: 8,
                objectives: [
                  'Define currency exchange rates',
                  'Explain the differences between base and quote currencies',
                  'Understand the economic mechanics of buyers and sellers'
                ],
                prerequisites: [],
                explanation: 'Financial markets revolve around exchange. In Forex, assets are always priced in pairs (e.g., EUR/USD). The first currency (EUR) is the Base Currency, and the second (USD) is the Quote Currency. The price indicates how much Quote currency is required to purchase one unit of the Base currency. Price moves are dictated entirely by order book supply and demand imbalance.',
                examples: [
                  'Example 1: EUR/USD trading at 1.1000 means 1 Euro is worth exactly 1.1000 US Dollars.',
                  'Example 2: GBP/JPY at 185.50 means 1 British Pound equals 185.50 Japanese Yen.'
                ],
                practice: {
                  title: 'Base/Quote Identification Practice',
                  instructions: 'Locate the currency ticker EUR/GBP on the market screen. Identify which currency acts as the price numerator (Base) and which acts as the denominator (Quote).',
                  promptHint: 'EUR is Base (first), GBP is Quote (second).'
                },
                quiz: [
                  {
                    question: 'In the GBP/USD currency pair, if the exchange rate rises, what is happening to the value of the British Pound?',
                    options: [
                      'The Pound is weakening against the Dollar',
                      'The Pound is strengthening against the Dollar',
                      'The Dollar is strengthening against the Pound',
                      'Both currencies are losing value'
                    ],
                    correctIndex: 1,
                    explanation: 'When the exchange rate rises, it means more quote currency (USD) is required to buy one base unit (GBP), signifying the British Pound is strengthening.'
                  }
                ]
              },
              {
                id: 'l1-2',
                levelId: 1,
                courseId: 'c1',
                moduleId: 'm1',
                title: 'Pips, Spreads, Lots, and Leverage',
                description: 'Master contract sizing, pip valuation, and leverage risk profiles.',
                difficulty: 'Beginner',
                estimatedMinutes: 10,
                objectives: [
                  'Calculate the value of a single pip in USD',
                  'Measure bid/ask spreads inside the order book',
                  'Determine risk ratios using leverage multiplier'
                ],
                prerequisites: ['l1-1'],
                explanation: 'A Pip (Percentage in Point) is the fourth decimal place (0.0001) in most pairs. A standard lot corresponds to 100,000 units of currency. Spreads represent the transaction fee charged by liquidity providers (Ask price minus Bid price). Leverage (e.g., 1:100) allows you to control large contract sizes using a fraction of actual capital as margin.',
                examples: [
                  'Pip calculation: In EUR/USD, 1 pip at 1.0900 equals 1.0901. For a standard lot, 1 pip = $10.',
                  'Leverage example: With 1:100 leverage, a position worth $100,000 requires only $1,000 in account margin.'
                ],
                practice: {
                  title: 'Pip Value Calculator Lab',
                  instructions: 'Calibrate your lot sizing to match your stop-loss distance. If your stop loss is 20 pips on EUR/USD, what lot size restricts total risk to $200?',
                  promptHint: '20 pips * $10 per standard lot = $200. Thus, a 1.0 standard lot limits your risk.'
                },
                interactiveType: 'risk_calculator',
                quiz: [
                  {
                    question: 'If you buy EUR/USD at 1.0850 and sell it at 1.0855, how many pips did you gain?',
                    options: [
                      '0.5 Pips',
                      '5 Pips',
                      '50 Pips',
                      '500 Pips'
                    ],
                    correctIndex: 1,
                    explanation: 'The difference is 0.0005, which corresponds to exactly 5 pips in foreign exchange valuation.'
                  }
                ]
              }
            ]
          },
          {
            id: 'm2',
            courseId: 'c1',
            title: 'Mechanics of Order Execution',
            description: 'Learn when global markets trade, how candlestick charts convey sentiment, and how to execute stop and limit orders.',
            missionBriefing: {
              objective: 'Learn to navigate global market session overlaps, read candlestick bodies, and place pending orders.',
              recognitionTarget: 'Spot open/close candlestick levels, distinguish between London/New York session hours, and recognize limit order boundaries.',
              marketConditions: 'High-liquidity overlap sessions, characterized by rapid order book turnover.',
              prerequisites: 'Module 1 completion.',
              practiceRequirement: 'Run candlestick projections and place test limit orders in the trade simulator.',
              masteryStandard: 'Correctly identify bullish and bearish candlestick structures inside the interactive candlestick explorer.'
            },
            lessons: [
              {
                id: 'l1-3',
                levelId: 1,
                courseId: 'c1',
                moduleId: 'm2',
                title: 'Leverage, Margin, and Order Types',
                description: 'Understand margin requirement thresholds and executing market/pending orders.',
                difficulty: 'Beginner',
                estimatedMinutes: 9,
                objectives: [
                  'Explain margin calls and stop-out limits',
                  'Place buy-stops and sell-limits inside the terminal',
                  'Distinguish between instant market orders and pending limit orders'
                ],
                prerequisites: ['l1-2'],
                explanation: 'A market order executes instantly at the best available price. A limit order waits for price to reach a more favorable level (lower for buying, higher for selling). A stop order waits for price to break past a level to enter in that same direction. Managing your margin level prevents broker liquidation (Margin Call).',
                examples: [
                  'Limit buy: Entering a buy order at 1.0500 when current market price is 1.0600.',
                  'Stop buy: Entering a buy order at 1.0700 when current market is 1.0600 (anticipating breakout).'
                ],
                practice: {
                  title: 'Order Placement Simulator',
                  instructions: 'Practice setting a Stop-Loss and Take-Profit zone on a test trade.',
                  promptHint: 'Stop-loss acts as a safety exit; take-profit acts as your target exit.'
                },
                quiz: [
                  {
                    question: 'Which order type should you use if you want to buy an asset only after it breaks above a specific resistance level?',
                    options: [
                      'Buy Limit Order',
                      'Market Buy Order',
                      'Buy Stop Order',
                      'Sell Stop Order'
                    ],
                    correctIndex: 2,
                    explanation: 'A Buy Stop order enters a buy position when the price crosses above a specified target level, capturing breakout momentum.'
                  }
                ]
              },
              {
                id: 'l1-4',
                levelId: 1,
                courseId: 'c1',
                moduleId: 'm2',
                title: 'Sessions, Candlesticks, and Timeframes',
                description: 'Read Japanese candlestick morphology and synchronize with global session overlaps.',
                difficulty: 'Foundational',
                estimatedMinutes: 10,
                objectives: [
                  'Analyze Japanese Candlestick OHLC anatomy',
                  'Understand Sydney, Tokyo, London, and New York session cycles',
                  'Align analysis across Monthly, Daily, and Hourly timeframes'
                ],
                prerequisites: ['l1-3'],
                explanation: 'Japanese candlesticks represent buying and selling sentiment through their bodies and wicks. Wicks indicate price rejection, while the body represents the net change between the Open and Close. Global trading is divided into four major sessions. Volatility spikes when the London and New York sessions overlap.',
                examples: [
                  'Bullish Candle: Close is higher than Open (colored green).',
                  'Bearish Candle: Close is lower than Open (colored red).'
                ],
                practice: {
                  title: 'Candle Morphology Drill',
                  instructions: 'Look for long-wick candles in the candlestick explorer to spot zones of price rejection.',
                  promptHint: 'Long lower wicks suggest bullish rejection; long upper wicks suggest bearish rejection.'
                },
                interactiveType: 'candlestick',
                quiz: [
                  {
                    question: 'What do long wicks (shadows) at the top of a candlestick body typically represent?',
                    options: [
                      'Strong continuation of bullish momentum',
                      'Price rejection by sellers pushing the price back down',
                      'Inactivity of institutional market participants',
                      'A gap in liquidity during market close'
                    ],
                    correctIndex: 1,
                    explanation: 'An upper wick indicates that buyers initially pushed price high, but sellers stepped in to reject that level, forcing the candle to close lower.'
                  }
                ]
              }
            ]
          },
          {
            id: 'm3',
            courseId: 'c1',
            title: 'Chart Reading & Risk Control',
            description: 'Begin reading price trends, plotting support/resistance zones, and applying position sizing.',
            missionBriefing: {
              objective: 'Learn trendline drawing, basic risk-to-reward metrics, and the fundamentals of trading psychology.',
              recognitionTarget: 'Spot higher highs and lower lows, identify support lines, and compute 1:2 R:R ratios.',
              marketConditions: 'Trending and consolidating price ranges.',
              prerequisites: 'Module 2 completion.',
              practiceRequirement: 'Map trendlines and support levels on the market structure canvas.',
              masteryStandard: 'Calibrate position sizes to never exceed a maximum of 1% equity risk.'
            },
            lessons: [
              {
                id: 'l1-5',
                levelId: 1,
                courseId: 'c1',
                moduleId: 'm3',
                title: 'Trends, Support, and Resistance',
                description: 'Map out horizontal key zones and identify the direction of the market trend.',
                difficulty: 'Foundational',
                estimatedMinutes: 9,
                objectives: [
                  'Plot historical support floors and resistance ceilings',
                  'Identify trend direction through swing points',
                  'Identify valid break and retest zones'
                ],
                prerequisites: ['l1-4'],
                explanation: 'An uptrend is characterized by Higher Highs (HH) and Higher Lows (HL). A downtrend features Lower Highs (LH) and Lower Lows (LL). Support represents a zone where buying demand matches supply, halting a drop. Resistance acts as a ceiling where selling supply overrides demand.',
                examples: [
                  'Support: Price bounces three times off 1.1200 before accelerating upward.',
                  'Resistance: Price struggles to break past 1.1500, dropping immediately upon contact.'
                ],
                practice: {
                  title: 'Horizontal Mapping Lab',
                  instructions: 'Draw horizontal zones on the structure explorer to identify key support/resistance lines.',
                  promptHint: 'Look for zones where the price pivoted direction multiple times.'
                },
                interactiveType: 'market_structure',
                quiz: [
                  {
                    question: 'What is the structural definition of an active uptrend?',
                    options: [
                      'Price moving sideways inside a consolidation box',
                      'A continuous sequence of Higher Highs and Higher Lows',
                      'A continuous sequence of Lower Highs and Lower Lows',
                      'A rapid drop in daily volume'
                    ],
                    correctIndex: 1,
                    explanation: 'Uptrends systematically create higher peaks (Higher Highs) and shallower valleys (Higher Lows) as buy orders absorb liquidity.'
                  }
                ]
              },
              {
                id: 'l1-6',
                levelId: 1,
                courseId: 'c1',
                moduleId: 'm3',
                title: 'Risk Management & Psychology Fundamentals',
                description: 'Understand the mathematical necessity of position sizing and trading discipline.',
                difficulty: 'Beginner',
                estimatedMinutes: 8,
                objectives: [
                  'Establish a maximum 1% risk-per-trade rule',
                  'Explain the psychological pitfalls of FOMO and revenge trading',
                  'Calculate exact risk-to-reward ratios before execution'
                ],
                prerequisites: ['l1-5'],
                explanation: 'A professional strategy relies on risk control. Trading psychology is the discipline of executing a trading plan without letting fear or greed interfere. Always employ a stop-loss and seek at least a 1:2 risk-to-reward ratio to ensure a long-term mathematical advantage.',
                examples: [
                  'A trader risking $10 to make $20 has a 1:2 Risk/Reward ratio. They only need a 35% win rate to remain profitable.',
                  'Revenge trading: Instantly entering another trade with doubled lot size to recover from a loss.'
                ],
                practice: {
                  title: 'Psychology Diagnostic check',
                  instructions: 'Write a rule-based checklist: No trading unless 3 structural confirmations exist.',
                  promptHint: 'A structured plan prevents emotional market entries.'
                },
                quiz: [
                  {
                    question: 'If you have a 1:3 Risk-to-Reward ratio on your trades, what minimum win rate is required to break even over time (excluding spreads)?',
                    options: [
                      '25%',
                      '40%',
                      '50%',
                      '60%'
                    ],
                    correctIndex: 0,
                    explanation: 'At 1:3, losing 3 trades costs $30, while winning just 1 trade yields $30. Thus, a 25% win rate is the break-even threshold.'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    level: 2,
    title: 'Intermediate',
    subtitle: 'Market Structure & Liquidity Frameworks',
    description: 'Master higher-timeframe trend alignments, structural breaks, liquidity sweeps, breakouts, retests, and premium/discount pricing pools.',
    badgeName: 'Academy Specialist',
    courses: [
      {
        id: 'c2',
        levelId: 2,
        title: 'Analytical Charting & Market Structure',
        description: 'Bridge the gap between simple indicators and raw institutional price action delivery.',
        modules: [
          {
            id: 'm4',
            courseId: 'c2',
            title: 'Advanced Market Structure Alignment',
            description: 'Learn HH/HL dynamics, trend shifts, consolidation zones, breakouts, and support/resistance flips.',
            missionBriefing: {
              objective: 'Learn to track market structural transitions, consolidation exits, and retest zones.',
              recognitionTarget: 'Spot break of trendlines, identify support turning into resistance, and pinpoint consolidation boundaries.',
              marketConditions: 'Transitioning markets shifting from consolidation ranges to clean trending directions.',
              prerequisites: 'Level 1 complete.',
              practiceRequirement: 'Mark breakout entries on the multi-timeframe interactive canvas.',
              masteryStandard: 'Accurately map structural flips on three consecutive practice charts.'
            },
            lessons: [
              {
                id: 'l2-1',
                levelId: 2,
                courseId: 'c2',
                moduleId: 'm4',
                title: 'Market Structure: Swing Points & Trend ID',
                description: 'Analyze Higher Highs, Higher Lows, Lower Highs, and Lower Lows.',
                difficulty: 'Intermediate',
                estimatedMinutes: 9,
                objectives: [
                  'Track market structural bias on Daily/4H charts',
                  'Locate consolidation boxes and range boundaries',
                  'Differentiate between minor corrections and major trend changes'
                ],
                prerequisites: [],
                explanation: 'Trends persist until structural integrity is broken. In an uptrend, if price fails to form a new Higher High and instead drops below the previous Higher Low, a trend shift is indicated. Marking major swing points on higher timeframes prevents you from trading against key market momentum.',
                examples: [
                  'Trend Shift: GBP/USD drops below its 4-hour support floor, confirming a bearish shift.',
                  'Consolidation: Price remains bound between 1.2500 and 1.2580 for 5 days.'
                ],
                practice: {
                  title: 'Swing Mapping Drill',
                  instructions: 'Locate the major daily swing low on the active chart to determine where the bullish trend would be invalidated.',
                  promptHint: 'The lowest point of the last major daily pullback is the key invalidation zone.'
                },
                interactiveType: 'market_structure',
                quiz: [
                  {
                    question: 'What occurs when price breaks below a valid Higher Low in an active uptrend?',
                    options: [
                      'The uptrend continues with stronger force',
                      'The market enters immediate high-volume consolidation',
                      'Market structure shifts, indicating a potential bearish reversal',
                      'Leverage requirements increase automatically'
                    ],
                    correctIndex: 2,
                    explanation: 'Violating a Higher Low signals that sellers have overridden the previous structural demand base, indicating a potential reversal.'
                  }
                ]
              },
              {
                id: 'l2-2',
                levelId: 2,
                courseId: 'c2',
                moduleId: 'm4',
                title: 'Breakouts, Retests, and S/R Flips',
                description: 'Identify high-probability entries when broken levels flip roles.',
                difficulty: 'Intermediate',
                estimatedMinutes: 9,
                objectives: [
                  'Spot support-to-resistance structural flips',
                  'Filter out false breakouts using volume indicators',
                  'Identify optimal entry points on price retests'
                ],
                prerequisites: ['l2-1'],
                explanation: 'When a strong support floor is broken, it frequently flips to become a resistance ceiling. This happens because institutional players who were trapped in buy orders look to close their positions at break-even during pullbacks. Waiting for a retest of the broken level, combined with clear price rejection, yields higher-probability entries than chasing breakouts.',
                examples: [
                  'Support-to-Resistance Flip: EUR/USD breaks 1.1000 support, pulls back to 1.1000, rejects with a long upper wick, and accelerates downward.'
                ],
                practice: {
                  title: 'Retest Entry Practice',
                  instructions: 'Identify a retest opportunity on the interactive chart after price breaks out of a clear range.',
                  promptHint: 'Look for the first corrective pullback to touch the broken range boundary.'
                },
                quiz: [
                  {
                    question: 'Why does support often turn into resistance once it is broken?',
                    options: [
                      'Brokers manually manipulate the pricing ceiling',
                      'Trapped buyers exit positions at break-even, creating selling pressure',
                      'The market volume drops to zero immediately',
                      'Required margin doubles automatically'
                    ],
                    correctIndex: 1,
                    explanation: 'Sellers and trapped buyers both execute sell orders at the broken level to exit or hedge positions, creating a fresh wave of supply.'
                  }
                ]
              }
            ]
          },
          {
            id: 'm5',
            courseId: 'c2',
            title: 'Liquidity Pools & Premium Pricing',
            description: 'Understand multi-timeframe analysis, liquidity mechanics, and premium vs. discount pricing pools.',
            missionBriefing: {
              objective: 'Learn about equal highs/lows liquidity pools, premium/discount Fibonacci zones, and multi-timeframe correlation.',
              recognitionTarget: 'Spot double tops/bottoms liquidity pools, measure 50% equilibrium, and coordinate weekly charts with daily entries.',
              marketConditions: 'Consolidation pools with liquidity building above and below range extremes.',
              prerequisites: 'Module 4 completion.',
              practiceRequirement: 'Apply Fibonacci measurements from swing low to swing high on the chart explorer.',
              masteryStandard: 'Demonstrate identification of premium/discount pricing boundaries on active structures.'
            },
            lessons: [
              {
                id: 'l2-3',
                levelId: 2,
                courseId: 'c2',
                moduleId: 'm5',
                title: 'Introduction to Liquidity Pools',
                description: 'Spot Equal Highs, Equal Lows, and rest-orders.',
                difficulty: 'Intermediate',
                estimatedMinutes: 10,
                objectives: [
                  'Define buy-side and sell-side liquidity pools',
                  'Identify equal highs and equal lows on a chart',
                  'Understand where retail stop-losses accumulate'
                ],
                prerequisites: ['l2-2'],
                explanation: 'Markets are driven by liquidity (orders). Retail stop-losses accumulate above prominent highs (Buy-side liquidity) and below key lows (Sell-side liquidity). Double tops (Equal Highs) and double bottoms (Equal Lows) act as massive liquidity targets. Institutional players sweep these zones to fill their large orders before reversing price.',
                examples: [
                  'Equal Lows: Price bounces twice off 1.0500. A massive pool of retail sell-stops builds directly below 1.0500, waiting to be swept.'
                ],
                practice: {
                  title: 'Liquidity Identification Drill',
                  instructions: 'Locate equal highs on the market explorer and mark the liquidity pool that sits directly above them.',
                  promptHint: 'Buy-stops are resting above equal highs, representing buy-side liquidity.'
                },
                quiz: [
                  {
                    question: 'Where do retail stop-losses typically accumulate in large quantities?',
                    options: [
                      'Directly inside the center of consolidation ranges',
                      'Directly below major swing lows and above swing highs',
                      'Only during weekend market closures',
                      'In random order book clusters'
                    ],
                    correctIndex: 1,
                    explanation: 'Retail traders typically place stop-losses just beyond major structural pivot points, creating pools of resting liquidity.'
                  }
                ]
              },
              {
                id: 'l2-4',
                levelId: 2,
                courseId: 'c2',
                moduleId: 'm5',
                title: 'Premium, Discount, and Multi-Timeframe Analysis',
                description: 'Use the 50% Equilibrium rule and top-down chart analysis.',
                difficulty: 'Intermediate',
                estimatedMinutes: 10,
                objectives: [
                  'Map out the 50% Equilibrium level across a trading range',
                  'Only buy in Discount and only sell in Premium',
                  'Conduct a top-down analysis from Monthly to 15M charts'
                ],
                prerequisites: ['l2-3'],
                explanation: 'Always trade at favorable valuations. Measuring the current trading range using a 50% Equilibrium dividing line helps identify these zones: any price above 50% is a Premium (favorable for selling), and any price below 50% is a Discount (favorable for buying). This structural framework prevents you from chasing trades at expensive valuations.',
                examples: [
                  'Buying in Discount: Price pulls back to the 70.5% Fibonacci level of the daily range (deep discount) before rallying.',
                  'Top-down: Weekly trend is bullish, Daily is pulling back, 1H structure shifts bullish inside a Daily Discount zone, triggering a buy entry.'
                ],
                practice: {
                  title: 'Premium/Discount Mapping Lab',
                  instructions: 'Draw a range grid on the risk terminal, splitting a swing leg in half to identify the discount quadrant.',
                  promptHint: 'Set your buy orders strictly within the lower 50% discount zone of the active range.'
                },
                quiz: [
                  {
                    question: 'According to premium/discount theory, in which zone should you look to execute buy positions?',
                    options: [
                      'In the Premium zone (above 50% of the swing leg)',
                      'Only at the absolute highest point of consolidation',
                      'In the Discount zone (below 50% of the swing leg)',
                      'At any random breakout price'
                    ],
                    correctIndex: 2,
                    explanation: 'Discount pricing represents wholesale rates, giving buyers a high-probability mathematical edge and superior risk-to-reward ratios.'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    level: 3,
    title: 'Advanced SMC & ICT',
    subtitle: 'Institutional Liquidity & Order Delivery',
    description: 'Master advanced Smart Money Concepts (BOS, CHoCH, MSS, Order Blocks, Imbalances, FVG) and Inner Circle Trader (ICT) session kill zones, Judas swings, daily biases, and PD arrays.',
    badgeName: 'Academy Expert',
    courses: [
      {
        id: 'c3',
        levelId: 3,
        title: 'Smart Money Concepts (SMC)',
        description: 'Analyze how banks, central institutions, and algorithms deliver price through liquidity sweeps.',
        modules: [
          {
            id: 'm6',
            courseId: 'c3',
            title: 'SMC Structure & Order Blocks',
            description: 'Understand MSS, displacement, liquidity sweeps, Order Blocks, Breaker Blocks, and Fair Value Gaps.',
            missionBriefing: {
              objective: 'Master structural displacement, buy/sell-side sweeps, order block convergence, and Fair Value Gaps.',
              recognitionTarget: 'Spot sudden aggressive market moves, locate order block candle origins, and measure FVG imbalances.',
              marketConditions: 'High-volatility algorithmic pricing delivery with strong trend movements.',
              prerequisites: 'Intermediate level complete.',
              practiceRequirement: 'Pinpoint Fair Value Gaps and Order Blocks on the interactive structural pattern simulator.',
              masteryStandard: 'Correctly identify institutional order block zones with 100% accuracy on the pattern recognition tool.'
            },
            lessons: [
              {
                id: 'l3-1',
                levelId: 3,
                courseId: 'c3',
                moduleId: 'm6',
                title: 'BOS, CHoCH, MSS, and Displacement',
                description: 'Identify Market Structure Shifts and aggressive institutional displacement.',
                difficulty: 'Advanced',
                estimatedMinutes: 11,
                objectives: [
                  'Differentiate between a continuation (BOS) and a reversal (CHoCH)',
                  'Spot Market Structure Shifts (MSS) on lower timeframes',
                  'Identify strong, high-volume displacement candles'
                ],
                prerequisites: [],
                explanation: 'A Break of Structure (BOS) occurs when price continues in the direction of the dominant trend, breaking a previous swing point. A Change of Character (CHoCH) represents a trend reversal, breaking the previous opposing swing point. Displacement refers to an aggressive, high-volume move that leaves behind price imbalances, signaling institutional participation.',
                examples: [
                  'Displacement: A single 15-minute candle spans 30 pips on EUR/USD, easily slicing through multiple retail support levels.'
                ],
                practice: {
                  title: 'Displacement Identification Drill',
                  instructions: 'Find the candle with the largest body and minimal wicks to pinpoint the origin of institutional displacement.',
                  promptHint: 'Large full-bodied candles indicate strong institutional order delivery.'
                },
                interactiveType: 'market_structure',
                quiz: [
                  {
                    question: 'What is the key characteristic of market "displacement"?',
                    options: [
                      'Slow, low-volume sideways consolidation',
                      'Rapid, high-volume, aggressive candles slicing through key structural levels',
                      'A sudden broker spread enlargement during market rollover',
                      'Consistent equal highs and equal lows'
                    ],
                    correctIndex: 1,
                    explanation: 'Displacement is characterized by large, fast-moving candles, representing significant capital injection by central institutional participants.'
                  }
                ]
              },
              {
                id: 'l3-2',
                levelId: 3,
                courseId: 'c3',
                moduleId: 'm6',
                title: 'Order Blocks, Breaker Blocks, and Fair Value Gaps (FVG)',
                description: 'Map institutional order footprints and Fair Value Gaps.',
                difficulty: 'Advanced',
                estimatedMinutes: 12,
                objectives: [
                  'Identify valid bullish and bearish Order Blocks',
                  'Draw Breaker Blocks from failed Order Blocks',
                  'Locate Fair Value Gaps (FVG) and imbalance zones'
                ],
                prerequisites: ['l3-1'],
                explanation: 'An Order Block (OB) is the last candle of the opposite movement before a strong displacement leg begins. A Breaker Block is an Order Block that has been broken through, flipping its role to support/resistance on a retest. A Fair Value Gap (FVG) is a three-candle structure where a middle candle has an imbalance: the wick of candle 1 and candle 3 do not overlap, leaving a structural gap that the price often returns to fill.',
                examples: [
                  'Bullish Order Block: The last down-close candle before a rapid upward rally.',
                  'Fair Value Gap: Candle 1 high is 1.1000, Candle 2 is a large up-candle, Candle 3 low is 1.1020. The gap between 1.1000 and 1.1020 is the FVG.'
                ],
                practice: {
                  title: 'Fair Value Gap Mapping Lab',
                  instructions: 'Analyze the 3-candle imbalance pattern on the structure explorer and mark the Fair Value Gap zone.',
                  promptHint: 'The unfilled space between candle 1 wick and candle 3 wick is the FVG target.'
                },
                interactiveType: 'market_structure',
                quiz: [
                  {
                    question: 'What constitutes a Fair Value Gap (FVG) on a pricing chart?',
                    options: [
                      'A weekend market opening gap',
                      'A three-candle structure where the wicks of candle 1 and candle 3 do not touch, leaving an imbalance',
                      'A failed breakout below equal lows',
                      'The difference between bid and ask spreads'
                    ],
                    correctIndex: 1,
                    explanation: 'An FVG represents an imbalance in order flow, where buy or sell orders were executed too quickly to match opposing liquidity.'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'c4',
        levelId: 3,
        title: 'Inner Circle Trader (ICT) Framework',
        description: 'Explore institutional pricing algorithms, session kill zones, and daily bias rules.',
        modules: [
          {
            id: 'm7',
            courseId: 'c4',
            title: 'ICT Price Delivery Algorithms',
            description: 'Dive into PD arrays, dealing ranges, Judas swings, Power of Three, and session kill zones.',
            missionBriefing: {
              objective: 'Understand algorithmic pricing delivery, Judas swings, session kill zones, and the Power of Three (Accumulation, Manipulation, Distribution).',
              recognitionTarget: 'Identify London/NY session open hours, map daily bias directions, and spot Judas stop-hunts.',
              marketConditions: 'Time-and-price specific trading setups during high-volatility session openings.',
              prerequisites: 'Smart Money Concepts completion.',
              practiceRequirement: 'Plot London session open sweeps on the market structure explorer.',
              masteryStandard: 'Demonstrate precise timing coordination matching the ICT Kill Zones.'
            },
            lessons: [
              {
                id: 'l3-3',
                levelId: 3,
                courseId: 'c4',
                moduleId: 'm7',
                title: 'Judas Swings, Power of Three, and Kill Zones',
                description: 'Sync your entries with the institutional Time and Price algorithm.',
                difficulty: 'Advanced',
                estimatedMinutes: 12,
                objectives: [
                  'Explain the Power of Three (Accumulation, Manipulation, Distribution)',
                  'Avoid trading outside London and New York Kill Zones',
                  'Identify the Judas Swing stop-hunt at the session open'
                ],
                prerequisites: [],
                explanation: 'ICT revolves around Time and Price. The Power of Three describes how daily candlesticks form: first, price consolidates (Accumulation); next, it runs in the opposite direction of the true daily trend to hunt retail stops (Manipulation/Judas Swing); finally, it trends aggressively toward its true target (Distribution). Trading is restricted to precise session Kill Zones.',
                examples: [
                  'Judas Swing: London open aggressively rallies 15 pips above the Asian range high to sweep buy-stops, then reverses to drop 80 pips for the rest of the day.'
                ],
                practice: {
                  title: 'Kill Zone Timing Drill',
                  instructions: 'Highlight the Asian range (00:00 - 08:00 UTC) on your chart and observe how London open sweeps its high or low.',
                  promptHint: 'The sweep of the Asian range during the London session is a classic Judas Swing entry trigger.'
                },
                quiz: [
                  {
                    question: 'What does the "Manipulation" phase of the Power of Three represent?',
                    options: [
                      'The closing range of the daily candle',
                      'An artificial trend move designed to sweep retail stop-losses before the true trend begins',
                      'Sideways consolidation during bank holidays',
                      'Broker platform connection failures'
                    ],
                    correctIndex: 1,
                    explanation: 'Manipulation runs price against the true daily bias to trigger resting stop-losses, collecting liquidity before the real distribution phase begins.'
                  }
                ]
              },
              {
                id: 'l3-4',
                levelId: 3,
                courseId: 'c4',
                moduleId: 'm7',
                title: 'Daily Bias, PD Arrays, and Price Delivery',
                description: 'Construct a daily directional plan using Premium/Discount Arrays.',
                difficulty: 'Advanced',
                estimatedMinutes: 11,
                objectives: [
                  'Establish a clear daily directional bias',
                  'Rank PD Arrays (Mitigation, Breakers, Liquidity, FVG, Order Blocks)',
                  'Trade in harmony with institutional price delivery'
                ],
                prerequisites: ['l3-3'],
                explanation: 'PD Arrays represent institutional key zones sorted from premium to discount. Daily bias is determined by evaluating higher-timeframe order flow and target liquidity pools. When the daily bias is bullish, you look for long entries when the price drops into a discount PD Array (such as a bullish FVG or Order Block).',
                examples: [
                  'Daily bias: Daily chart is breaking highs (bullish). We map support zones (Discount PD arrays) on the 4-hour chart and wait for price to drop into a bullish FVG before entering long positions.'
                ],
                practice: {
                  title: 'Daily Bias Checklist',
                  instructions: 'Write down your daily bias hypothesis for the major pair: identify key higher timeframe liquidity targets.',
                  promptHint: 'Always aim for the closest uncollected higher-timeframe swing high or low.'
                },
                quiz: [
                  {
                    question: 'Which of the following is considered a discount PD Array element?',
                    options: [
                      'A bearish Order Block near swing highs',
                      'Equal highs liquidity pool',
                      'A bullish Fair Value Gap sitting below the 50% Equilibrium level',
                      'Asian Session High range'
                    ],
                    correctIndex: 2,
                    explanation: 'A bullish Fair Value Gap sitting below 50% Equilibrium represents a discount PD Array, acting as a high-probability institutional entry zone.'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    level: 4,
    title: 'Elite Trading',
    subtitle: 'Strategy Engineering, Math & Performance',
    description: 'Master rule-based strategy construction, backtesting, drawdown analysis, risk-of-ruin mathematics, DXY/Gold correlations, and institutional performance metrics.',
    badgeName: 'Academy Master',
    courses: [
      {
        id: 'c5',
        levelId: 4,
        title: 'Professional Strategy Engineering',
        description: 'Transition from a technical analyst to a quantitative risk manager.',
        modules: [
          {
            id: 'm8',
            courseId: 'c5',
            title: 'Strategy Optimization & Performance Math',
            description: 'Learn objective rule sets, backtesting protocols, expectancy calculations, and drawdown metrics.',
            missionBriefing: {
              objective: 'Learn to engineer rule-based strategies, calculate exact system expectancy, and manage drawdown constraints.',
              recognitionTarget: 'Identify drawdown clustering, evaluate system win/loss ratios, and calibrate risk-of-ruin thresholds.',
              marketConditions: 'Varying volatility regimes across global macroeconomic cycles.',
              prerequisites: 'Advanced SMC/ICT modules complete.',
              practiceRequirement: 'Build a rule-based strategy and run expectancy calculations inside the risk lab.',
              masteryStandard: 'Create a system with positive expectancy and a risk-of-ruin probability below 0.1%.'
            },
            lessons: [
              {
                id: 'l4-1',
                levelId: 4,
                courseId: 'c5',
                moduleId: 'm8',
                title: 'Rule-Based Strategy Construction & Expectancy',
                description: 'Build robust entry checklists and calculate system edge expectancy.',
                difficulty: 'Elite',
                estimatedMinutes: 12,
                objectives: [
                  'Translate loose trading ideas into strict, objective rules',
                  'Calculate mathematical trading expectancy',
                  'Design a backtesting protocol with a minimum of 100 historical trades'
                ],
                prerequisites: [],
                explanation: 'A professional strategy leaves zero room for emotional guesswork. Trading edge is defined by Expectancy: (Win Rate * Average Win Size) minus (Loss Rate * Average Loss Size). If your expectancy is positive, your system is mathematically guaranteed to generate profitability over a large sample size of trades.',
                examples: [
                  'Expectancy Calculation: System win rate is 45%, average win is $300, loss rate is 55%, average loss is $100. Expectancy = (0.45 * 300) - (0.55 * 100) = 135 - 55 = +$80 per trade.'
                ],
                practice: {
                  title: 'Strategy Invalidation Drill',
                  instructions: 'Draft your strategy entry checklist. It must contain: 1. HTF Trend bias, 2. LTF Liquidity Sweep, 3. Displacement entry trigger.',
                  promptHint: 'An objective checklist prevents entering trades based on emotion.'
                },
                quiz: [
                  {
                    question: 'If a trading strategy has a 30% win rate, but an average risk-to-reward ratio of 1:4, does it possess a positive expectancy?',
                    options: [
                      'No, because the win rate is below 50%',
                      'Yes, Expectancy is positive: (0.30 * 4) - (0.70 * 1) = +0.5 units per trade',
                      'No, because 1:4 setups are impossible to execute',
                      'Expectancy is exactly zero'
                    ],
                    correctIndex: 1,
                    explanation: 'Yes, despite the low win rate, the large average win size easily overcomes the small losses, yielding positive expectancy.'
                  }
                ]
              },
              {
                id: 'l4-2',
                levelId: 4,
                courseId: 'c5',
                moduleId: 'm8',
                title: 'Drawdown, Correlation, and Session regimes',
                description: 'Analyze macroeconomic correlations, DXY relations, and performance journaling.',
                difficulty: 'Elite',
                estimatedMinutes: 12,
                objectives: [
                  'Manage risk of ruin during drawdown streaks',
                  'Analyze US Dollar Index (DXY) inverse relationships with metals and majors',
                  'Implement institutional performance analytics and disciplined journaling'
                ],
                prerequisites: ['l4-1'],
                explanation: 'Elite traders focus on preserving capital. Drawdown is the peak-to-trough drop in account equity. Understating risk-of-ruin statistics is critical to avoiding margin liquidation. Concurrently, evaluating macro correlations—such as how the USD Index (DXY) impacts EUR/USD and Gold—provides a valuable compass for bias confirmation.',
                examples: [
                  'Correlation: When DXY breaks key resistance, XAU/USD (Gold) often experiences aggressive sell-offs.'
                ],
                practice: {
                  title: 'Drawdown mitigation plan',
                  instructions: 'Establish a personal drawdown safety policy: If account equity drops 5% in a single month, cut your risk per trade by half.',
                  promptHint: 'Mitigating risk during a drawdown streak prevents catastrophic account failure.'
                },
                quiz: [
                  {
                    question: 'If the US Dollar Index (DXY) breaks out of a major consolidation range to the upside, what is the highly correlated response expected on the EUR/USD pair?',
                    options: [
                      'EUR/USD will rally to the upside',
                      'EUR/USD will sell off to the downside, showing an inverse correlation',
                      'EUR/USD will freeze in volume',
                      'Both pairs will move in identical lockstep'
                    ],
                    correctIndex: 1,
                    explanation: 'Because the Euro is priced in USD (Quote currency), a rising US Dollar (DXY) creates downward pressure on EUR/USD, demonstrating an inverse correlation.'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

export const TRADING_GLOSSARY: GlossaryTerm[] = [
  {
    term: 'Bid Price',
    category: 'Execution',
    simpleDefinition: 'The price at which you can immediately sell an asset.',
    technicalExplanation: 'The highest price currently offered by buyers in the market order book.',
    example: 'If EUR/USD bid is 1.0850, executing a market sell triggers at this rate.'
  },
  {
    term: 'Ask Price',
    category: 'Execution',
    simpleDefinition: 'The price at which you can immediately buy an asset.',
    technicalExplanation: 'The lowest price currently offered by sellers in the market order book.',
    example: 'If EUR/USD ask is 1.0852, executing a market buy triggers at this rate.'
  },
  {
    term: 'Pip',
    category: 'Measurement',
    simpleDefinition: 'The standard unit of price movement in currencies.',
    technicalExplanation: 'The fourth decimal place (0.0001) in most standard exchange currency pairs.',
    example: 'Price moving from 1.0500 to 1.0510 represents a move of 10 pips.'
  },
  {
    term: 'Margin',
    category: 'Account',
    simpleDefinition: 'The collateral deposit required to keep a trade open.',
    technicalExplanation: 'The amount of equity locked by your broker as security to maintain active leveraged positions.',
    example: 'A 1 standard lot position with 1:100 leverage locks $1,000 as margin.'
  },
  {
    term: 'Leverage',
    category: 'Risk',
    simpleDefinition: 'Using borrowed capital to trade larger positions.',
    technicalExplanation: 'The ratio of your own capital to borrowed capital (e.g. 1:100), amplifying both potential wins and losses.',
    example: 'With $100 and 1:100 leverage, you can control a trade worth up to $10,000.'
  },
  {
    term: 'Order Block (OB)',
    category: 'Smart Money Concepts',
    simpleDefinition: 'A key zone where institutions placed large buying or selling positions.',
    technicalExplanation: 'The last opposing candle prior to a strong, high-volume displacement move.',
    example: 'The last down-close candle before a rapid bullish breakout.'
  },
  {
    term: 'Fair Value Gap (FVG)',
    category: 'Smart Money Concepts',
    simpleDefinition: 'An imbalance in price action that leaves an unfilled gap.',
    technicalExplanation: 'A three-candle pattern where the wicks of candle 1 and candle 3 do not overlap, leaving a zone of single-sided liquidity.',
    example: 'A large bullish candle whose pullbacks leave a pricing gap between the surrounding wicks.'
  },
  {
    term: 'Judas Swing',
    category: 'Inner Circle Trader',
    simpleDefinition: 'A false breakout trend at session open to hunt stop-losses.',
    technicalExplanation: 'An intentional, algorithmically driven stop-run that takes place early in a trading session to secure liquidity before delivering the true direction.',
    example: 'London session opens, rallies 15 pips to hunt highs, then drops 100 pips for the rest of the day.'
  },
  {
    term: 'Drawdown',
    category: 'Risk',
    simpleDefinition: 'The decline in account capital from its peak.',
    technicalExplanation: 'The peak-to-trough drop in account equity, measured as a percentage of total balance.',
    example: 'An account balance dropping from $10,000 to $9,200 represents an 8% drawdown.'
  }
];

const PROGRESS_KEY = 'appex_edu_progress_v2';

export function getStoredProgress(): UserEducationProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserEducationProgress;
      // Guarantee initial default metrics exist
      if (!parsed.streak) {
        parsed.streak = { current: 3, longest: 5, lastActiveDate: new Date().toISOString() };
      }
      if (parsed.practiceHours === undefined) parsed.practiceHours = 8.5;
      if (parsed.theoryHours === undefined) parsed.theoryHours = 12.0;
      if (!parsed.certificates) parsed.certificates = [];
      if (!parsed.completedLessons) parsed.completedLessons = [];
      if (!parsed.quizScores) parsed.quizScores = {};
      if (!parsed.notes) parsed.notes = {};
      if (!parsed.lessonTimeSpent) parsed.lessonTimeSpent = {};
      if (!parsed.lessonLastAccessed) parsed.lessonLastAccessed = {};
      if (!parsed.startedModules) parsed.startedModules = [];
      return parsed;
    }
  } catch (e) {
    // Ignore storage fetch errors
  }

  // Pure default initial state
  return {
    completedLessons: [],
    quizScores: {},
    currentLevel: 1,
    notes: {},
    streak: {
      current: 3,
      longest: 5,
      lastActiveDate: new Date().toISOString()
    },
    practiceHours: 8.5,
    theoryHours: 12.0,
    certificates: [],
    lessonTimeSpent: {},
    lessonLastAccessed: {},
    startedModules: []
  };
}

export function saveStoredProgress(progress: UserEducationProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    // Ignore storage write failures
  }
}
