# Glossary — Domain Terms, Linked

Every term the advisor docs lean on, pointing at an authoritative spec or explainer. Three buckets: [Balatro game mechanics](#balatro-game-mechanics), [machine learning](#machine-learning), and [infrastructure & APIs](#infrastructure--apis).

## Balatro game mechanics

These are **in-game [Balatro](https://balatrowiki.org/) mechanics**, not repo/tooling concepts. The advisor reasons about them; the [engine](./engine-plumbing.md) scores them.

| Term | What it is | Spec / explainer |
| --- | --- | --- |
| Blind | A scoring target you must beat; Small / Big / Boss per ante. | [Blinds](https://balatrowiki.org/w/Blinds) |
| Boss Blind | A blind with a disruptive rule (voids a hand type, debuffs cards, forces a card count, …). | [Boss Blinds](https://balatrowiki.org/w/Blinds#Boss_Blinds) |
| Ante | A group of three blinds; the run escalates ante by ante. | [Ante](https://balatrowiki.org/w/Ante) |
| Joker | A passive/triggered modifier; up to 5 held. Browslatro models ~150 as an `effect` union. | [Jokers](https://balatrowiki.org/w/Jokers) · [jokers-and-content.md](../onboarding/jokers-and-content.md) |
| Hand (poker hand) | The played-card category (Pair, Flush, …) that sets base chips × mult. | [Poker Hands](https://balatrowiki.org/w/Poker_Hands) · [scoring-pipeline.md](../onboarding/scoring-pipeline.md) |
| Chips / Mult | The two scoring quantities; score = ⌊chips × mult⌋. | [Score](https://balatrowiki.org/w/Score) |
| Enhancement | A per-card upgrade (Bonus, Mult, Glass, Steel, …). | [Enhancements](https://balatrowiki.org/w/Enhancements) |
| Seal | A per-card trigger (Gold, Red, Blue, Purple). | [Seals](https://balatrowiki.org/w/Seals) |
| Edition | Foil / Holographic / Polychrome / Negative; applies to cards and jokers. | [Editions](https://balatrowiki.org/w/Editions) |
| Tarot / Planet / Spectral | Consumable cards: Tarots transform cards, Planets level hand types, Spectrals are powerful/risky. | [Tarot](https://balatrowiki.org/w/Tarot_Cards) · [Planet](https://balatrowiki.org/w/Planet_Cards) · [Spectral](https://balatrowiki.org/w/Spectral_Cards) |
| Voucher | A permanent run-wide shop upgrade. | [Vouchers](https://balatrowiki.org/w/Vouchers) |
| Booster Pack | A shop pack offering a pick from several cards. | [Booster Packs](https://balatrowiki.org/w/Booster_Packs) |
| Tag | A reward earned by skipping a blind. | [Tags](https://balatrowiki.org/w/Tags) |
| Deck | The starting-deck variant (Red, Blue, …); changes starting rules. | [Decks](https://balatrowiki.org/w/Decks) |
| Stake | The difficulty tier (White … Gold). | [Stakes](https://balatrowiki.org/w/Stakes) |
| Economy / Interest | Money compounds between rounds (interest, capped). | [Economy](https://balatrowiki.org/w/Economy) |

## Machine learning

| Term | What it is here | Spec / explainer |
| --- | --- | --- |
| Imitation learning | Training the policy to copy an expert's choices (here the Monte-Carlo search agent + human play). | [Imitation learning](https://en.wikipedia.org/wiki/Imitation_learning) |
| Monte-Carlo rollout | Estimating a move's value by averaging random playouts from it. | [MCTS](https://en.wikipedia.org/wiki/Monte_Carlo_tree_search) |
| MLP | The 3-layer fully-connected `CandidateScorer` network. | [Multilayer perceptron](https://en.wikipedia.org/wiki/Multilayer_perceptron) |
| ReLU | The activation between layers. | [ReLU](https://en.wikipedia.org/wiki/Rectifier_(neural_networks)) |
| Logit | The raw scalar the net outputs per candidate; sorted to rank. | [Logit](https://en.wikipedia.org/wiki/Logit) |
| Softmax / cross-entropy | The listwise loss: push the chosen candidate's logit above the rest. | [Softmax](https://en.wikipedia.org/wiki/Softmax_function) · [Cross-entropy](https://en.wikipedia.org/wiki/Cross-entropy) |
| Learning to rank | The framing of "pick the best of N candidates". | [Learning to rank](https://en.wikipedia.org/wiki/Learning_to_rank) |
| Adam | The optimizer (`lr = 1e-3`). | [Adam](https://arxiv.org/abs/1412.6980) |
| One-hot encoding | How categoricals (rank, suit, deck, …) enter the feature vector. | [One-hot](https://en.wikipedia.org/wiki/One-hot) |
| Knowledge distillation | Baking an expensive teacher's judgment into the cheap student (the LLM-teacher work). | [Distillation](https://en.wikipedia.org/wiki/Knowledge_distillation) |
| Data leakage | Why train/val split is keyed on `runSeed`, not per-record. | [Leakage](https://en.wikipedia.org/wiki/Leakage_(machine_learning)) |
| ONNX | The portable model format the policy is exported to. | [ONNX](https://onnx.ai/) |
| ONNX Runtime Web | Runs the `.onnx` model in the browser. | [onnxruntime-web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) |
| Chance node / expectimax | Search over a stochastic game (future RL direction, `#1331`). | [Expectiminimax](https://en.wikipedia.org/wiki/Expectiminimax) |
| AlphaZero | The RL family the `#1331` roadmap adapts. | [AlphaZero](https://en.wikipedia.org/wiki/AlphaZero) |
| Grounding / RAG | Injecting retrieved wiki notes into the prompt. | [RAG](https://en.wikipedia.org/wiki/Retrieval-augmented_generation) |
| Xorshift PRNG | The seeded RNG behind reproducible headless runs. | [Xorshift](https://en.wikipedia.org/wiki/Xorshift) |

## Infrastructure & APIs

| Term | What it is here | Spec / explainer |
| --- | --- | --- |
| Anthropic Messages API | The LLM endpoint the advisor calls. | [Messages API](https://docs.anthropic.com/en/api/messages) |
| Structured output (JSON schema) | Forcing the model to emit the `ADVICE_SCHEMA` shape. | [Tool use / structured output](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) |
| Extended thinking | The `thinking: { type: "adaptive" }` reasoning budget. | [Extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) |
| Prompt caching | `cache_control: ephemeral` on the static system block. | [Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) |
| Vercel function | The serverless host for `/api/advice`. | [Vercel Functions](https://vercel.com/docs/functions) · [maxDuration](https://vercel.com/docs/functions/configuring-functions/duration) |
| Sliding-window rate limit | The per-IP / global limiter algorithm. | [Ratelimit algorithms](https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms) |
| Upstash Redis REST / Vercel KV | The durable rate-limit backend. | [Upstash REST](https://upstash.com/docs/redis/features/restapi) · [Vercel Storage](https://vercel.com/docs/storage) |
| BYOK | Bring-your-own (Anthropic) key, stored client-side, sent as `x-advisor-key`. | [Anthropic API keys](https://docs.anthropic.com/en/api/admin-api/apikeys/get-api-key) |
| AbortSignal.timeout | The client-side fetch timeout. | [AbortSignal.timeout](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) |
| JSONL | The line-delimited dataset format. | [JSON Lines](https://jsonlines.org/) |
| Zustand | The app store the advisor snapshots from. | [Zustand](https://github.com/pmndrs/zustand) · [architecture.md](../onboarding/architecture.md) |
| CC BY-NC-SA 3.0 | The (non-commercial, share-alike) license on the wiki content. | [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) · [wiki-retrieval.md](./wiki-retrieval.md#licensing--attribution) |
