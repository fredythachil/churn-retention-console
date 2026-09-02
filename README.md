# Churn Risk & Retention Console

An operational console for a retention team. It loads the Telco customer base,
scores every customer for churn risk, explains each score, and lets an agent
record what they did about it.

The three questions it answers, in order:

1. **Who is at risk right now?** — a filterable, sortable call list with a
   visible risk indicator on every row.
2. **Why does the model think that?** — a per-factor breakdown showing exactly
   how each customer reached their score, plus a `/model/info` endpoint that
   exposes the whole rule set.
3. **What have we already done?** — a validated outreach state machine with a
   full timestamped audit trail per customer.

---

## Quick start

### Docker (one command)

```bash
docker compose up --build
```

- API: http://localhost:8000 (interactive docs at `/docs`)
- UI: http://localhost:5173

### Local

Two terminals. Python 3.12 and Node 22 are what I developed against.

**Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

You should see `Loaded 7043 customers (0 skipped)` in the startup log.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

**Tests**

Tests need pytest and httpx on top of the runtime dependencies:

```bash
cd backend
pip install -r requirements-dev.txt
pytest -v
```

48 tests, a couple of seconds.

---

## Repository structure

```
.
├── data/
│   └── WA_Fn-UseC_-Telco-Customer-Churn.csv   bundled dataset, read at startup
│
├── docs/
│   └── BRIEF.md                               the original assessment brief
│
├── analysis/
│   └── 01_explore.ipynb                       one-off analysis that produced the weights
│
├── backend/
│   ├── app/
│   │   ├── main.py                            app factory, lifespan startup, middleware
│   │   ├── core/
│   │   │   └── logging.py                     request logging + global error handler
│   │   ├── routes/
│   │   │   ├── customers.py                   list, detail, stats, outreach PATCH
│   │   │   └── model.py                       /model/info
│   │   ├── services/
│   │   │   ├── scoring_rules.py               the weights, as data
│   │   │   ├── scoring.py                     applies the rules
│   │   │   ├── outreach.py                    state machine + transition validation
│   │   │   └── query.py                       filter / sort / paginate
│   │   ├── models/                            Pydantic schemas
│   │   │   ├── customer.py
│   │   │   ├── outreach.py                    stages, sub-stages, transition tables
│   │   │   ├── scoring.py
│   │   │   └── pagination.py                  generic Page[T]
│   │   └── data_access/
│   │       ├── loader.py                      CSV parse + clean
│   │       └── store.py                       in-memory store, score cache, write lock
│   ├── tests/
│   │   ├── test_scoring.py                    24 tests
│   │   ├── test_outreach.py                   9 tests
│   │   └── test_api.py                        15 tests
│   ├── requirements.txt                       runtime only
│   ├── requirements-dev.txt                   + tests and the notebook
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts                      the only place fetch is called
│   │   │   └── customers.ts                   typed endpoint functions
│   │   ├── types/
│   │   │   ├── api.ts                         mirrors the Pydantic models
│   │   │   └── labels.ts                      API identifiers to display text
│   │   ├── components/                        badges, charts, stage flow, states
│   │   ├── views/
│   │   │   ├── CustomerListView.tsx           the call list
│   │   │   └── CustomerDetailView.tsx         profile, log, why-this-score
│   │   └── index.css                          design tokens and all styling
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## API

| Method  | Path                       | Purpose                                                      |
|---------|----------------------------|--------------------------------------------------------------|
| `GET`   | `/customers`               | Paginated, filtered, sorted call list                        |
| `GET`   | `/customers/{id}`          | Full record + risk score + factor breakdown + outreach state |
| `GET`   | `/customers/summary/stats` | Aggregate counts for the dashboard panels                    |
| `PATCH` | `/customers/{id}/outreach` | Validated stage transition, appends to history               |
| `GET`   | `/model/info`              | Weights, tier thresholds, and excluded fields with reasons   |
| `GET`   | `/health`                  | Liveness                                                     |

---

## Framework choices

**FastAPI** for the backend. The brief asks for I/O-bound work to be handled
efficiently, and FastAPI is ASGI-native, so `async` is the honest answer rather
than threads bolted onto a sync framework. Pydantic also rejects malformed input
before my handler runs, which covers a good part of the 400-level error handling
for free, and `/docs` is generated from the route signatures — a reviewer can
exercise the whole API in a browser without reading any code. I have more
production hours in Flask, but Flask would have meant hand-writing validation and
arguing for async separately.

**React + TypeScript (Vite)** for the client. The TS interfaces in
`types/api.ts` mirror the Pydantic models one-for-one, so a change on the API
side surfaces as a compile error in the client rather than a runtime surprise.
Vite because `create-react-app` is unmaintained.

**No router.** There are two views. `window.history.pushState` plus a `popstate`
listener gives working browser back/forward and shareable URLs
(`#/customer/9605-WGJVW`) in about ten lines. Hash routing rather than path
routing, so a refresh does not 404 without server rewrite rules.

**Plain CSS, no framework.** One stylesheet with custom properties for the design
tokens. The risk tier colours are defined once in `:root` and every badge, bar
and chart reads from them, so the palette cannot drift between components.

---

## Data modelling

The CSV is read once at startup with the stdlib `csv` module, converted to
Pydantic `Customer` objects, and held in a dict keyed by `customer_id`.

I deliberately did **not** use pandas in the service. A DataFrame is a columnar
structure built for maths across rows; this API loads once and then looks up
individual records. Building a DataFrame only to loop over it converting rows to
objects means paying for it and not using it. Pandas belongs in the notebook,
where the group-by analysis actually needed it — it is in `requirements-dev.txt`,
not `requirements.txt`.

**Naming.** The CSV is inconsistent (`customerID`, `MonthlyCharges`, `tenure`).
That translation happens once, at the loader boundary. Everything inside the
application sees `snake_case`, and a change to the source format touches one
file.

**Types.** Genuinely two-valued fields become real booleans, including
`SeniorCitizen`, which arrives as `0`/`1` while every other flag is `Yes`/`No`.
But `tech_support`, `online_security` and the other add-ons stay strings, because
they have **three** values — `Yes`, `No`, and `No internet service`. That third
value matters (see scoring below) and forcing them to bool would destroy it.

**The `TotalCharges` problem.** The column arrives as text rather than a number,
because 11 of the 7,043 rows contain a blank. Every one of those 11 has
`tenure = 0`. They are not corrupt records — they are new customers who have
never been billed, so the blank is factually correct. I set them to `0.0`.

I rejected the alternatives: dropping the rows deletes 11 real customers, and new
customers are exactly the segment a retention tool cares about; mean-filling
invents a billing history that never happened.

**Per-row error handling.** The loader wraps each row in `try/except`. A
malformed row logs a warning with its line number and is skipped; it does not
kill the load. One bad row taking down the entire API at startup would be a much
worse failure than serving 7,042 customers. This caught a real bug during
development — I briefly added a field to the wrong model, and the log told me
immediately that all 7,043 rows had failed validation and why, instead of the
service dying on import.

---

## Risk scoring

**There is no ML model here, deliberately.** The brief is explicit that the
heuristic is a stand-in, and building one would have been time spent on something
the console does not need. What I built instead is a weighted additive scorecard
— structurally the same thing as a credit risk scorecard — with the weights
calibrated from the data rather than invented.

### How the weights were derived

I used Weight of Evidence and Information Value, which is the standard method for
building this kind of additive scorecard. Baseline churn across the dataset is
**26.54%**. Every factor's weight is sized by how far its groups sit from that
baseline.

| Factor             | Values                                                | Information Value |
|--------------------|-------------------------------------------------------|-------------------|
| Contract           | Month-to-month 42.7% · One year 11.3% · Two year 2.8% | 1.24              |
| Tenure             | 0–6mo 52.9% → 49+mo 9.5%                              | 0.71              |
| Internet           | Fiber 41.9% · DSL 19.0% · None 7.4%                   | 0.62              |
| Payment method     | E-check 45.3% · Mailed 19.1% · Automatic ~16%         | 0.46              |
| Protective add-ons | Missing ~40% vs present ~15%                          | 0.15–0.42         |
| Demographics       | Senior 41.7% · No partner 33.0% · No dependents 31.3% | 0.11–0.16         |

### The confound I nearly missed

Every service column carries a `No internet service` value, and that group churns
at **7.4%** — the most loyal segment in the dataset. So all six add-on columns
inherit InternetService's predictive power, and their raw Information Value is
inflated.

Recomputing on internet-having customers only (n = 5,517):

| Column              | Raw IV | True IV   | Change   |
|---------------------|--------|-----------|----------|
| OnlineSecurity      | 0.718  | 0.416     | −42%     |
| TechSupport         | 0.700  | 0.394     | −44%     |
| OnlineBackup        | 0.529  | 0.185     | −65%     |
| DeviceProtection    | 0.500  | 0.150     | −70%     |
| **StreamingTV**     | 0.381  | **0.006** | **−98%** |
| **StreamingMovies** | 0.381  | **0.007** | **−98%** |

Streaming looks strong on the raw numbers and is statistically worthless once the
confound is removed. Anyone trusting the raw figure would have weighted it.

Two consequences. Streaming is excluded. And the four protective add-ons are not
equal — support and security are roughly 2.5× as predictive as backup and
protection — so they are weighted 4/4/2/2 rather than evenly.

It also means the scoring has to be three-way, not two-way. A phone-only customer
"missing" tech support is not at risk; they never had internet. Treating that as
a plain `No` would penalise the most loyal segment in the book. There is a test
pinning this behaviour.

### The weights

Total 100 points:

| Factor             | Weight | Distribution                                            |
|--------------------|--------|---------------------------------------------------------|
| Contract           | 30     | Month-to-month 30 · One year 8 · Two year 0             |
| Tenure             | 25     | 0–6mo 25 · 7–12 17 · 13–24 11 · 25–48 5 · 49+ 0         |
| Payment method     | 15     | E-check 15 · Mailed 6 · Bank auto 2 · Card auto 0       |
| Internet service   | 12     | Fiber 12 · DSL 5 · None 0                               |
| Protective add-ons | 12     | Tech support 4 · Security 4 · Backup 2 · Protection 2   |
| Demographics       | 6      | Senior 2 · No partner 2 · No dependents 1 · Paperless 1 |

Tiers: **0–24 Low · 25–49 Medium · 50–74 High · 75+ Critical**

Every safest option scores zero. A two-year, long-tenured customer paying by
automatic card scores near 0, and the agent can see at a glance to leave them
alone.

Contract gets the largest weight even though tenure has the higher single value
(52.9% vs 42.7%), because contract has the wider *spread* — 42.7% down to 2.8%,
a 15× range, separating the whole population rather than just the top slice. It
is also the only factor an agent can change on a call. You can offer someone a
twelve-month contract; you cannot offer them more tenure.

Tenure is capped below contract because the two overlap — month-to-month
customers are disproportionately new, so both partly measure commitment. Churn
still moves with tenure *inside* each contract type (month-to-month runs 55% →
26% across the tenure bands), so keeping both is justified, but weighting them
equally would let two correlated signals own 60% of the score.

Demographics are weighted low on purpose. They are measurable but not actionable,
and scoring retention offers on household characteristics is something to do
sparingly.

### What I left out, and why

`/model/info` exposes these exclusions with their reasons, so the console itself
can show what the model ignores:

- **gender** — 26.9% vs 26.2% against a 26.5% baseline. No signal. I would not
  have used it regardless: deciding who gets a retention offer by gender is a
  fairness problem, not just a statistical one.
- **StreamingTV / StreamingMovies** — IV 0.006 and 0.007 once the confound is
  removed.
- **MultipleLines** (IV 0.008) and **PhoneService** (IV 0.001) — no signal.
- **TotalCharges** — correlates 0.9996 with `tenure × MonthlyCharges`. It
  restates tenure rather than adding anything.

Knowing what does not predict is part of the analysis, and most of these would
have been silently dropped without measuring them.

### Does it work?

I scored all 7,043 customers and checked whether the score actually separates
churners.

| Tier           | Customers | Actual churn |
|----------------|-----------|--------------|
| Low (0–24)     | 1,866     | 2.7%         |
| Medium (25–49) | 1,437     | 11.9%        |
| High (50–74)   | 1,985     | 28.9%        |
| Critical (75+) | 1,755     | 61.2%        |

23× separation between the extremes, with reasonably balanced band sizes so every
tier is a usable worklist. Split into deciles, the rate rises monotonically from
1.2% to 71.5% with no reversals, so the ranking holds all the way down and not
just at the edges.

**AUC 0.833.** For reference, published logistic regression results on this exact
dataset sit at 0.84–0.85. A hand-tuned scorecard lands within one to two points
of a trained model, with no ML at runtime and a score that can be fully explained
to the customer being called.

I also tested three different weightings — my judgement-based split, one
proportional to Information Value, and a contract-heavy variant. They came out at
0.8326, 0.8302 and 0.8305. Statistically indistinguishable. A contract-only score
managed 0.739.

So **the exact weights barely matter; using several factors at all is what
matters.** The split is a business and explainability decision rather than a
statistical one, and I picked the one that explains best. If someone asks why
contract is 30 and not 35, that is my answer.

### Explaining the score

`GET /customers/{id}` returns the score together with every factor's
contribution, its maximum, and a plain-English reason. The breakdown is a
by-product of scoring rather than a second code path, so the explanation cannot
disagree with the number.

Factors scoring **zero** are returned too. A two-year contract comes back as
`0/30 — "Two-year contract, strongly locked in"`. An agent should see what is
protecting a customer, not only what is hurting them.

The weights live in `scoring_rules.py` as **data, not conditionals**. The scoring
service reads that structure and `/model/info` serialises the same object, so
tuning a weight updates the scorer, the API documentation and the frontend's
explanation together. If the rules were `if` statements, the endpoint would be a
hand-written description that drifts the first time someone changes a number.

---

## Outreach state machine

The brief suggests `NOT_CONTACTED → IN_PROGRESS → RESOLVED` and invites
adjustment. I split the terminal state, because "we called and saved them" and
"we called and they left anyway" are completely different outcomes, and a team
that cannot tell them apart cannot measure whether the calling works.

```
NOT_CONTACTED ──► IN_PROGRESS ──► RETAINED
                       │      └──► LOST
                       │
   RETAINED / LOST ────┘   (reopen: at risk again, or win-back)
```

Each stage carries sub-stages, scoped to their stage and validated the same way
transitions are:

| Stage           | Sub-stages                                            |
|-----------------|-------------------------------------------------------|
| `NOT_CONTACTED` | —                                                     |
| `IN_PROGRESS`   | Awaiting customer · Callback due · No answer          |
| `RETAINED`      | Offer accepted · Stayed, no offer                     |
| `LOST`          | Left over price · Left over service · Never reachable |

The two-level model comes from a lead CRM I built at my current job. Transition
rules stay at the stage level, so the machine itself stays small — a sub-stage is
a label within a stage, not a new node.

Each sub-stage exists because it changes a decision:

- **No answer** vs **Awaiting customer** — one goes back on today's call list,
  the other does not.
- **Callback due** — actively off today's list until its time.
- **Offer accepted** vs **Stayed, no offer** — one cost margin and one did not.
  That is how you find out whether discounting is even necessary.
- **Price** vs **Service** vs **Unreachable** — three different departments'
  problems: pricing, product, and our own contact data.

**`NOT_CONTACTED → RETAINED` is rejected** with a 409, which is the brief's
explicit example. There are two tests for it.

**Every stage can transition to itself.** That is how a note or a repeated
attempt gets recorded without moving the customer — the agent calls, gets
voicemail, calls again, gets voicemail. Three history entries, one stage.

**`LOST → RETAINED` is not allowed directly.** A lost customer has cancelled;
winning them back means reopening to `IN_PROGRESS` and doing the work, and the
history should show that work happened. Two steps, not one.

**Sub-stages are optional.** A stage change without one is valid, otherwise the
UI would have to force a choice on every update.

### The audit trail

Every transition appends an immutable event: from-stage, to-stage, sub-stage,
note, UTC timestamp. A status field alone tells you where a customer is; it
cannot tell you what was already tried. The history is what answers the brief's
third question, and it is what the detail view's timeline renders.

`apply_transition` is a pure function — state in, new state out, no mutation, no
storage access, no FastAPI import. That is what makes it testable without a
server, and there is a test asserting the original state is untouched so nobody
later "optimises" it into an in-place append.

---

## Pagination and filtering

All server-side. `GET /customers` never returns more than a page.

```
GET /customers?page=2&page_size=25&tier=CRITICAL&contract=Month-to-month
              &outreach_stage=NOT_CONTACTED&search=9605&min_score=70
              &sort_by=score&descending=true
```

The response is a generic envelope:

```json
{
  "items": [...],
  "total": 7043,
  "page": 1,
  "page_size": 10,
  "total_pages": 705,
  "has_next": true,
  "has_previous": false
}
```

`Page[T]` is generic and reusable, and the envelope gives the client everything
it needs to render pagination controls without a second request.

**Offset pagination, not cursor.** The UI has numbered pages and needs to jump to
page 40. Cursor pagination scales better and cannot do that. The trade-off is
covered under scaling below.

**List rows are summaries**, not full customer records — id, tenure, contract,
internet, monthly charges, score, tier, outreach stage, and the top three scoring
factors. Enough to scan and decide who to call; the detail endpoint has the rest.
Sending the full object and factor breakdown for every row would multiply the
list payload for information the agent is not reading yet.

**`page_size` is capped at 100** by Pydantic, so a client cannot request all
7,043 rows in one call.

**`sort_by` is whitelisted.** It comes from the URL and is used with `getattr`,
so an open field name would let a caller probe object internals. An unknown field
returns 400 with the list of allowed values rather than a generic rejection.

**Sorting is stable.** `customer_id` is a secondary sort key, because roughly
1,700 customers score 100 and without a tie-break their order could shuffle
between page loads — an agent working down a list would lose their place.

**Nothing is computed per request.** Both the score and the list row are built
once at startup and held in the store, so `/customers` only filters, sorts and
slices values that already exist. I did originally score inside the route, and
profiling is what changed my mind: scoring all 7,043 customers takes 288 ms and
building 7,043 `CustomerSummary` objects takes another 67 ms — paid in full on
every request, to return 25 rows. Caching both took the endpoint from roughly
370 ms to 13 ms, and `/customers/summary/stats` from 300 ms to 5 ms.

**The cache is invalidated at the one place its input changes.** Outreach is the
only mutable part of a summary, so `store.set_outreach` takes the new state and
the rebuilt row together and writes both — inside the same lock the PATCH already
holds. Making it one call rather than two means the projection cannot be left
stale by a caller who forgets the second step, and
`test_outreach_change_appears_in_the_list` guards it.

---

## Error handling and logging

| Code | When                                                                     |
|------|--------------------------------------------------------------------------|
| 200  | Success                                                                  |
| 400  | Unknown `sort_by` field                                                  |
| 404  | Customer does not exist                                                  |
| 409  | Valid stage value, illegal transition                                    |
| 422  | Malformed body or query params (Pydantic)                                |
| 500  | Anything unhandled — logged with a traceback, returned with a request ID |

**400 vs 409 vs 422 is a deliberate distinction.** `{"stage": "BANANA"}` is
malformed input, and Pydantic rejects it with a 422 before my code runs.
`{"stage": "RETAINED"}` on a `NOT_CONTACTED` customer is a perfectly valid value
in an illegal state — that is what 409 Conflict means. Collapsing all three into
400 would lose information the client can act on.

The state machine raises a custom `InvalidTransition` rather than `ValueError`,
so the route catches exactly that failure. A bare `ValueError` would also catch
an unrelated bug three calls deeper and report it to the client as a conflict.

**Request logging middleware** assigns every request a short ID and logs it as
key-value pairs:

```
request_id=a3f91b2c method=PATCH path=/customers/9605-WGJVW/outreach status=409 duration_ms=2.8
```

Greppable, and it parses into any log aggregator without a custom pattern.

**The request ID closes a loop.** It goes out on the `X-Request-ID` response
header, the frontend surfaces it in the error toast, the agent reads it out, and
I find the exact request in the logs.

**Unhandled exceptions never leak.** The middleware catches anything the route
did not, logs the full traceback server-side, and returns a clean 500 carrying
only the request ID. A stack trace in a response tells an attacker your file
paths and library versions.

On the client, `api/client.ts` is the only place `fetch` is called. It normalises
both FastAPI error shapes — `HTTPException` returns a string `detail`, Pydantic
returns an array of field errors, and without handling both a validation error
renders as `[object Object]`. It also distinguishes "the server said no" from
"the server was unreachable", which need different UI. A dead backend shows
*"Cannot reach the API. Check that the backend is running."* with a retry button,
not a blank screen.

---

## Parallelism and concurrency

**Startup runs off the event loop.** Reading, parsing and scoring 7,043 rows is
blocking work — the scoring pass alone is 288 ms — so `lifespan` wraps the whole
thing in `asyncio.to_thread`. Without that, the loop is frozen for the duration
of the load.

**Writes are locked.** `asyncio.Lock` makes the PATCH read-modify-write atomic.
Two agents updating the same customer simultaneously could otherwise both read
the old state, and the second write would silently discard the first — including
its history entry. Outreach is the only mutable state in the application, so it
is the only thing that needs a lock; customer reads need none, because nothing
mutates them after startup.

**I did not parallelise the scoring pass**, and that is a deliberate answer
rather than an omission. It costs 288 ms, once, at boot. A `ProcessPoolExecutor`
would have to pickle 7,043 Pydantic objects out to workers and the results back,
which is most of that budget spent on serialisation to save a fraction of a
second that nobody is waiting on — the server is not serving traffic yet. The
cheaper win was not doing the work repeatedly, which is what the cache above is
for. Moving it off the loop was worth it; spreading it across cores was not.

Where async genuinely pays here is the request path: after startup it is
CPU-light and does no I/O at all, so a single worker handles many concurrent
requests without threads.

---

## Testing

**48 tests, about 1.5 seconds.** The speed comes from the layering — the scoring
and state machine services import nothing from FastAPI, so most tests need no
server at all.

**`test_scoring.py` (24)** — every test starts from a helper that builds the
safest possible customer, scoring 0, then adds only the risk being tested. That
means a test asserting `contract == 30` is genuinely isolating contract rather
than measuring an accidental mix. Parametrised cases check **both edges of every
tenure band** (6→25 and 7→17, 48→5 and 49→0), which is where off-by-one bugs
live. There is a test asserting the weights still sum to 100, so tuning one
without adjusting another fails the build. And there is one pinning the
`No internet service` behaviour — if someone later simplifies the add-on check to
`!= "Yes"`, it breaks.

**`test_outreach.py` (9)** — the brief's illegal jump, twice
(`NOT_CONTACTED → RETAINED` and `→ LOST`). Sub-stage scoping. Same-stage repeat
attempts. Reopening after a resolution. The full history trail in order with
notes preserved. And immutability of the input state.

**`test_api.py` (15)** — real HTTP through FastAPI's test client, covering all
four endpoints and every error path: 400, 404, 409, 422. Includes a test that
page 1 and page 2 share no customers, which catches the classic off-by-one, and
one that a PATCH is visible in a subsequent list query — a genuine integration
check rather than a unit test.

**One test failed on the first run, and it was my expectation that was wrong.**
I had asserted that a month-to-month customer at one month paying by e-check
would land in `CRITICAL`. It scored 70 — High. The baseline test customer has no
internet, so internet (12) and add-ons (12) were both unavailable and a quarter
of the scale was out of reach. The scoring was right. The finding is real, too:
phone-only customers churn at 7.4% and *should* struggle to reach the top tier.

**What is not covered.** No frontend tests. With the time available I chose
backend depth over breadth, on the basis that the scoring rules and transition
validation are where a silent bug does real damage — a UI bug is visible the
moment you look at the screen. If I were adding tests next, the first would be
Vitest around `api/client.ts`'s error normalisation and the stage flow's
transition guards.

There is also no load testing, so the concurrency reasoning above is argued
rather than measured.

---

## Trade-offs

**Transition rules are duplicated in the frontend.** `NEXT_STAGES` and
`SUB_STAGES_FOR_STAGE` in `types/labels.ts` mirror the backend tables, so the UI
only offers legal choices and an agent never clicks a button that returns 409.
The alternatives were worse: let them click and learn the rules by hitting
errors, or add a round-trip before the control can render.

This is UX, not enforcement — the API validates every transition regardless and
remains the only source of truth. But the cost is real, and it bit me during
development: I added self-transitions to the backend so notes could be logged
without a stage change, forgot the frontend copy, and a control silently stopped
working. The proper fix is to serve the transition table from the API and have
the client fetch it. I would do that before adding a fifth stage.

**In-memory only.** Explicitly in scope, but to be clear what it means: restart
the server and every outreach record is gone. Customers reload from the CSV;
outreach state does not, because there is nowhere to persist it.

**No authentication.** Out of scope per the brief. In practice, a console that
records who called which customer needs to know who "who" is — the audit trail
currently records what happened but not who did it.

**Filtering is a full scan.** Fine at 7,043 rows; see below.

**Two views, no router.** Browser back and shareable URLs work via the History
API, but there is no route-level code splitting, and adding a third view would be
the point to bring in a real router.

**The notebook is exploratory.** `analysis/01_explore.ipynb` is committed as
evidence for the weights rather than as production code. Nothing imports it.

---

## Scaling bottlenecks

Written as if this were going to production, because the interesting constraints
are all in the data layer.

**Single process, no persistence.** The in-memory store means one instance. Two
behind a load balancer would each hold their own copy of the outreach state, and
an agent's update would appear or vanish depending on which one they hit. This is
the first thing to fix, and the fix is a database — the store module exists
precisely so that change touches one file. Everything else goes through function
calls whose signatures would not change.

**Filtering is O(n) per request.** Every `/customers` call walks all 7,043
customers, filters, sorts, then slices. At this size it is microseconds. At 7
million it is unusable, and the answer is indexed database queries with the
filtering pushed into SQL rather than Python.

**Offset pagination degrades on deep pages.** `OFFSET 500000` makes a database
count and discard half a million rows. Keyset pagination (`WHERE score < :last`)
stays constant-time, at the cost of losing numbered page jumps. Worth switching
once the dataset is large enough that anyone actually pages that deep.

**Scoring is startup-computed.** Fine while the scorer is a pure function of
attributes that never change. The moment it becomes a versioned ML service, this
needs a score cache keyed by `(customer_id, model_version)` and a backfill job on
deployment — otherwise every model release means re-scoring the entire base
synchronously at boot.

**Outreach writes are last-write-wins.** The lock prevents corruption within one
process, but two agents editing the same customer will still have one silently
overwrite the other. Optimistic concurrency — a version field, or `If-Match` with
an ETag, returning 409 on conflict — is the fix, and it matters as soon as a team
shares a queue.

**Startup cost grows linearly.** Loading and scoring at boot is fine for a
million-row CSV and wrong for a hundred million. That becomes a batch job writing
scores to a table, with the API reading them.

**Swapping the heuristic for a real model changes nothing structurally.** The API
contract is a score plus per-factor contributions, which is the same shape SHAP
values produce. `scoring.py` would call a model service instead of reading a
rules table, `/model/info` would report the model version and its feature
importances, and neither the routes nor the frontend would need to change. That
was the point of keeping the rules as data behind a service boundary.

---

## With more time

In the order I would actually do them:

1. **Serve the transition rules from the API** so the frontend stops keeping its
   own copy. This is a real bug source and it already caused one.
2. **Frontend tests** — Vitest around the API client's error handling and the
   stage flow's transition guards.
3. **Who did what.** The audit trail records the action and the time but not the
   agent. Even without full auth, an agent identifier on each event would make
   the history far more useful.
4. **Bulk actions.** Selecting twenty critical customers and marking them all as
   contacted is the obvious next workflow, and the state machine already supports
   it.
5. **Persistence** — Postgres, and the store module is already the seam.
6. **Tasks and scheduled callbacks.** This is the biggest gap, and the one I
   would build first if the console went into real use. `CALLBACK_DUE` records
   that a callback is owed, but nothing surfaces it at the right time, so the
   agent has to remember. I would attach tasks to a customer: a type (call,
   email, follow-up), a due date and time, an assigned agent, a note, and an
   open/done state. That turns the console from a list you scan into a queue that
   tells you what to do next.

   With that in place the landing screen becomes "what is due today" rather than
   "everyone sorted by score" — overdue first, then due today, then upcoming.
   Logging an outreach with `CALLBACK_DUE` would create the task automatically
   from the date the agent picks, so the sub-stage and the reminder stay in step
   instead of being two things to keep in sync by hand. Reminders would start as
   an in-app badge and a due-today count, and only become email or push if
   someone asks for it.

   It also closes a loop that is currently open: the audit trail records what
   happened, but nothing records what is *meant* to happen next.
7. **Score history.** Scores are computed once and never change. Tracking how a
   customer's risk moves over time would tell a retention team whether their
   interventions actually work — which is the question the whole console exists
   to support.
