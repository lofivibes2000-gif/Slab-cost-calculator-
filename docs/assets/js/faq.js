/* ==========================================================================
   PourCost — FAQ content, renderer, and FAQPage schema generator.

   SINGLE SOURCE OF TRUTH: the visible FAQ and the structured data are both
   generated from the same records, so the two can never drift out of sync.

   STRUCTURE
   ---------
   CORE  — the handful of questions that genuinely apply to any pour. These
           appear on every page.
   PAGE_FAQ — questions owned by one page, each written for that page's
           subject. Keeping them page-owned stops every page competing for
           the same set of queries.

   faqFor(pageKey) returns the union; faqFor("faq") returns every question
   on the site, deduplicated by id.

   Answers are written to be genuinely useful first — a specific number, the
   reasoning behind it, and what moves it.
   ========================================================================== */
(function (global) {
  "use strict";

  /* ======================================================================
     CORE FAQ — shared across every page (the bottom-of-page FAQ block)
     ====================================================================== */
  var CORE = [
    {
      id: "cost-per-sq-ft",
      q: "How much does a concrete slab cost per square foot?",
      a: "A standard residential concrete slab runs <strong>$6 to $12 per square foot</strong> installed in 2026, with most projects landing near <strong>$8 per square foot</strong>. That figure includes ready-mix concrete, delivery, a compacted gravel base, forms, reinforcement, placing and finishing labor, control joints, and curing compound — but not major excavation, permits, or decorative finishes.\n\n" +
          "The cost per square foot breaks down roughly like this:\n\n" +
          "<ul><li><strong>Concrete material:</strong> $2–$3.30 per sq ft</li><li><strong>Labor (pour and finish):</strong> $3–$8 per sq ft — usually the single biggest line</li><li><strong>Site prep and forms:</strong> $1–$2.50 per sq ft</li><li><strong>Reinforcement:</strong> $0.20–$2.00 per sq ft</li><li><strong>Curing and sealer:</strong> $0.25–$1.00 per sq ft</li></ul>\n\n" +
          "Small slabs cost more per square foot than large ones because the truck delivery, crew minimum, and forms are fixed costs spread over less area. A 10 x 10 pad typically runs $8.50–$15.00 per sq ft, while a 40 x 60 driveway lands closer to $6.50–$12.50 per sq ft. Decorative work — stamped, colored, or exposed aggregate — adds $3 to $10 per sq ft on top.\n\n" +
          "<strong>One important caveat about scope.</strong> Published per-square-foot figures disagree by nearly 40%, and the reason is that they measure different things. A quote at $6 per sq ft is often scoped to exclude delivery fees, control joints, curing compound, and site prep — real costs that a complete project pays. Price the same scope before comparing two bids; a lower number is not a better deal if it is missing items."
    },
    {
      id: "pour-cost",
      q: "How much does it cost to pour a concrete slab?",
      a: "Pouring a concrete slab costs <strong>$4 to $14 per square foot</strong> installed, depending on thickness, reinforcement, finish, and how much site work the ground needs. A plain broom-finished 4-inch slab on a flat, accessible site sits at the low end; a thick, reinforced slab on ground that needs grading and fill sits at the high end.\n\n" +
          "Realistic totals for common sizes at $6–$12 per sq ft:\n\n" +
          "<ul><li>10 x 10 pad (100 sq ft): $600–$1,200</li><li>12 x 12 pad (144 sq ft): $864–$1,730</li><li>20 x 20 slab (400 sq ft): $2,400–$4,800</li><li>24 x 24 garage pad (576 sq ft): $3,500–$9,000</li><li>30 x 30 slab (900 sq ft): $3,600–$7,200</li></ul>\n\n" +
          "A useful shortcut: the concrete itself is only about 25% of an installed slab. Labor is usually 45–55%. That is why a slab quoted at $4 per square foot for materials alone is not out of line — it simply excludes the crew."
    },
    {
      id: "bags-needed",
      q: "How many bags of concrete do I need?",
      a: "Divide the pour's volume in cubic feet by the finished yield of one bag, then round up. Standard yields are <strong>0.30 ft³ for a 40 lb bag, 0.45 ft³ for a 60 lb bag, and 0.60 ft³ for an 80 lb bag</strong>.\n\n" +
          "<span class=\"formula\">Bags = ceil( volume in ft³ x (1 + waste%) / yield per bag )</span>\n\n" +
          "One cubic yard of concrete equals about <strong>90 bags of 40 lb, 60 bags of 60 lb, or 45 bags of 80 lb</strong> mix.\n\n" +
          "Worked example — a 10 x 10 ft slab at 4 inches thick:\n<ul><li>Volume = 10 x 10 x (4 ÷ 12) = 33.3 ft³ = 1.23 yd³</li><li>With 10% waste: 36.7 ft³</li><li>80 lb bags: ceil(36.7 ÷ 0.60) = <strong>62 bags</strong></li><li>60 lb bags: ceil(36.7 ÷ 0.45) = <strong>82 bags</strong></li></ul>\n\n" +
          "Bagged mix stops making sense above roughly 1 cubic yard. Past about 45 bags of 80 lb mix, hauling, mixing, and pouring by hand costs more in time and labor than a ready-mix truck — and cold joints between batches are far more likely."
    },
    {
      id: "yards-needed",
      q: "How many yards of concrete do I need?",
      a: "Multiply length by width by thickness in feet, then divide by 27. There are 27 cubic feet in a cubic yard.\n\n" +
          "<span class=\"formula\">Cubic yards = (Length ft x Width ft x Thickness in ÷ 12) ÷ 27<br>Shortcut: Cubic yards = (sq ft x thickness in) ÷ 324</span>\n\n" +
          "For a 20 x 20 ft slab at 4 inches: (400 x 4) ÷ 324 = 4.94 cubic yards. Add 5–10% for waste and order about 5.5 yards.\n\n" +
          "As a rule of thumb, one cubic yard covers about <strong>81 sq ft at 4 inches</strong>, 65 sq ft at 5 inches, 54 sq ft at 6 inches, and 41 sq ft at 8 inches. A standard ready-mix truck carries about 10 cubic yards."
    },
    {
      id: "thickness",
      q: "How thick should a concrete slab be?",
      a: "Spec it by load, not by rule of thumb:\n\n" +
          "<ul><li><strong>3.5–4 in</strong> — walkways, garden paths, patios, shed and AC pads (foot traffic only)</li><li><strong>4 in</strong> — the standard residential minimum; patios and light floors</li><li><strong>5 in</strong> — residential driveways and garage floors carrying passenger cars or half-ton pickups</li><li><strong>6 in</strong> — driveways taking trucks and RVs, heavy equipment pads, and commercial slabs</li><li><strong>8 in</strong> — post-tensioned, heavily loaded, or industrial slabs</li></ul>\n\n" +
          "For code: the International Residential Code (R506.1) sets a <strong>3.5-inch minimum</strong> for slab-on-grade floors in habitable space, and most jurisdictions amend that to 4 inches. The IRC does not regulate exterior patios and walkways, though local codes often do govern driveways — published driveway standards run from 4 to 7 inches depending on the municipality.\n\n" +
          "ACI 330R-08 puts it plainly: <em>\"As a practical matter, there is no benefit in building slabs less than 4 in. (100 mm) thick.\"</em> Thickness is the cheapest structural upgrade available — bending capacity scales with the square of thickness, so 4 in to 6 in is 50% more concrete but roughly 2.25x the bending resistance."
    },
    {
      id: "psi",
      q: "What PSI concrete do I need for a slab?",
      a: "Match the strength to the exposure and the load:\n\n" +
          "<ul><li><strong>3,000 PSI</strong> — interior slabs, basement floors, and shop floors that never see salt or freezing</li><li><strong>3,500 PSI</strong> — standard patios, sidewalks, and exterior residential work</li><li><strong>4,000 PSI</strong> — driveways, garage floors, and any exterior slab in a freeze-thaw climate, specified with 5–7% air entrainment</li><li><strong>4,500–5,000 PSI</strong> — heavy vehicle pads, warehouse slabs, and structural work per ACI 318</li></ul>\n\n" +
          "ACI 332 requires 4,000 PSI with air entrainment for exterior residential slabs in freeze-thaw zones. Each 500 PSI step up adds roughly $4–$10 per cubic yard, which is cheap insurance against scaling and spalling. In freeze-thaw climates, air entrainment matters more than an extra inch of thickness — 3,000 PSI slabs without air can scale badly within 5 to 10 years."
    }
  ];

  /* ======================================================================
     PAGE-SPECIFIC FAQ — appended to CORE on the given pages
     ====================================================================== */
  var PAGE_FAQ = {
    "index": [
      {
        id: "slab-estimator-what",
        q: "What does this concrete slab cost calculator actually calculate?",
        a: "It turns a slab's dimensions into a full installed price, not just a material quantity. From length, width, and thickness it derives the cubic yards and bag counts, then builds a line-item cost breakdown: ready-mix concrete, delivery, short-load fees, pump truck, site prep, gravel sub-base, forms, reinforcement, vapor barrier, placing and finishing labor, decorative finish, saw-cut control joints, and curing compound and sealer.\n\n" +
            "It also returns a <strong>low / typical / high range</strong> rather than one false-precise number, because every one of those rates carries real variance. Each line is priced at a low, typical, and high unit rate and the totals are summed, so the range reflects actual uncertainty instead of a fudge factor.\n\n" +
            "You can override any price to match a real quote, and the whole model recalculates live."
      },
      {
        id: "slab-estimator-accuracy",
        q: "How accurate is this concrete slab cost estimate?",
        a: "Treat it as a <strong>planning range</strong>, and it will be accurate for budgeting and for sanity-checking a contractor's quote. Every default rate is a 2026 U.S. national average drawn from published ready-mix supplier price lists, national cost guides, and industry benchmark ranges — not a quote for your address.\n\n" +
            "The estimate is most accurate when the site is flat, accessible, and reasonably prepared, and you have local prices in front of you to enter. It is least accurate where access is tight, excavation is significant, or the ground is poor.\n\n" +
            "It is <strong>not</strong> a structural design, a code determination, an engineering calculation, or a bid. For anything carrying vehicles, structural loads, or subject to inspection, follow your local building department and your engineer's specifications."
      },
      {
        id: "slab-estimator-order",
        q: "How do I order concrete for my slab?",
        a: "You order by the cubic yard, not by the bag, when you use ready-mix.\n\n" +
            "<ol><li>Compute your order quantity including the waste allowance — the calculator does this for you.</li><li>Round up to the next quarter yard, which is how plants sell it.</li><li>Call the plant and ask for the delivered price at your yardage, including any short-load fee, fuel surcharge, and environmental fee.</li><li>Specify the PSI, air entrainment if you are in a freeze-thaw climate, and the aggregate size.</li><li>Confirm the delivery window and whether a pump is required.</li><li>Have forms, base, reinforcement, and a crew ready before the truck arrives — a ready-mix truck waits, and waiting is billed.</li></ol>\n\n" +
            "For bagged concrete, buy the same product in one consistent mix and stage the bags so you do not run out mid-pour."
      },
      {
        id: "10x10",
        q: "How much concrete do I need for a 10x10 slab?",
        a: "A 10 x 10 ft slab at 4 inches thick needs <strong>1.23 cubic yards</strong> of concrete — about 33.3 cubic feet. With the standard 10% waste allowance, order <strong>1.35 cubic yards</strong>, or 1.5 yd³ since ready-mix is sold in quarter-yard increments.\n\n" +
            "In bags that works out to roughly <strong>62 bags of 80 lb mix</strong>, 82 bags of 60 lb, or 123 bags of 40 lb.\n\n" +
            "At 6 inches thick the same footprint needs 1.85 cubic yards (2.03 with waste), and at 8 inches, 2.47 cubic yards."
      },
      {
        id: "20x20",
        q: "How much does a 20x20 concrete slab cost?",
        a: "A 20 x 20 ft slab covers 400 square feet. Installed, it costs about <strong>$2,400 to $4,800</strong> at the standard $6–$12 per square foot. A 4-inch broom-finish slab over a 4-inch gravel base with welded wire mesh, fully scoped through delivery, joints, curing and site prep, lands near <strong>$4,200–$4,400</strong> in an average-cost market.\n\n" +
            "Typical line-item breakdown for a 400 sq ft slab in 2026:\n\n" +
            "<ul><li>Ready-mix concrete (4.94 yd³ + 10% waste = 5.43 yd³): $842 typical</li><li>Delivery: $120–$180</li><li>Site prep and compacted gravel base: $540–$1,100</li><li>Forms: $180–$360</li><li>Welded wire mesh: $80–$360</li><li>Vapor barrier: $40–$130</li><li>Placing and finishing labor: $1,200–$3,200</li><li>Control joints, curing compound: $180–$460</li></ul>\n\n" +
            "Quoted figures lower than that usually scope out site prep, control joints, curing compound, or delivery. Price the same scope before comparing bids.\n\n" +
            "Going to 6 inches adds 50% more concrete — about $420 more in material — but far more in bending strength, since slab capacity scales with the square of thickness."
      },
      {
        id: "base",
        q: "Do I need a gravel base under my concrete slab?",
        a: "Yes. A compacted gravel base is the single most important thing under a slab, and skipping it is the number one cause of early cracking and heave.\n\n" +
            "<strong>4 inches of compacted crushed stone</strong> is the standard under residential slabs, and 6 inches is typical under driveways and garage floors. On a 1,000 sq ft slab, 4 inches of base works out to about 12.3 cubic yards — roughly 17 to 20 tons.\n\n" +
            "Installed base runs about <strong>$0.75 to $1.90 per square foot</strong>, depending on stone price and haul distance. On poor soil, engineered fill can push that to $2.50 per sq ft.\n\n" +
            "The base does three jobs: it distributes the load, it provides a stable uniform surface so the slab does not have to bridge over voids, and it lets water drain away instead of undermining the slab. A slab's strength depends more on the uniformity of what is underneath than on its own thickness."
      },
      {
        id: "quote-check",
        q: "How do I check a contractor's concrete slab quote?",
        a: "Compare line by line, not just the total. A complete quote should itemize:\n\n" +
            "<ol><li>Excavation to depth and grading</li><li>Compacted gravel base — thickness and material</li><li>Forms, set and removed</li><li>Reinforcement — rebar size and spacing, or mesh, and how it is supported</li><li>Concrete mix, PSI rating, and whether air entrainment is included</li><li>Delivery, short-load fees, and whether a pump is needed</li><li>Placing and finishing labor, and which finish is specified</li><li>Control joints — sawn or tooled, and the spacing</li><li>Curing compound or sealer</li><li>Cleanup and haul-off of any removed material</li></ol>\n\n" +
            "Three red flags: no base line item (the slab will crack), a per-square-foot price too low to include labor, and a single price for every size (small pours cost more per foot). If a quote comes in under $4 per square foot, something significant is missing — usually site prep, base, or joints.\n\n" +
            "Get three quotes, ask each one to price the identical scope, and compare what is actually in the scope rather than the bottom line."
      },
      {
        id: "joints",
        q: "How far apart should control joints be in a concrete slab?",
        a: "Joint spacing should be no more than <strong>2 to 3 times the slab thickness in inches</strong>. ACI 330R puts it at 30 times the thickness; the American Concrete Pavement Association uses 24 times with a 15-foot cap.\n\n" +
            "Practical spacing by thickness:\n\n" +
            "<ul><li>4 in slab — joints every 8 to 10 ft</li><li>5 in slab — joints every 10 to 12 ft</li><li>6 in slab — joints every 12 to 15 ft</li><li>8 in slab — joints every 15 ft (cap)</li></ul>\n\n" +
            "Control joints are the actual crack-control mechanism. Concrete cracks where you tell it to, and you tell it where the joint is. Reinforcement keeps cracks from opening wide, but the joint decides where the crack happens.\n\n" +
            "Saw-cut within a few hours of finishing, before the slab can cure enough to shrink. Tooled joints work for straight runs, but a saw gives you tighter control on curves and odd shapes."
      },
      {
        id: "diy",
        q: "Can I pour a concrete slab myself?",
        a: "Yes, for small pours. A 10 x 10 patio at 4 inches is about 1.23 cubic yards — 62 bags of 80 lb mix, or one short ready-mix load.\n\n" +
            "What a DIY pour involves:\n\n" +
            "<ol><li>Excavate and grade, then lay and compact the gravel base</li><li>Install a vapor barrier and form the edges</li><li>Set reinforcement on chairs at mid-depth</li><li>Pour, screed, bull-float, edge, and broom or trowel finish</li><li>Cut control joints, then cure and seal</li></ol>\n\n" +
            "The realistic DIY cost for materials only runs <strong>$2.50 to $4.50 per square foot</strong> for a 4-inch slab — roughly $250 to $450 for a 10 x 10 pad in bags. Add a mixer rental around $50–$90 per day if you are not batching by hand.\n\n" +
            "Where DIY gets expensive is labor, not material. A crew for a residential pour is 3 to 5 people, and 40 to 70 labor hours for 1,000 sq ft. For anything over about 2 cubic yards, professional placement usually costs less than doing it yourself."
      },
      {
        id: "regional",
        q: "Why does concrete cost more in my area than the national average?",
        a: "Concrete pricing tracks local construction volume, fuel costs, and how many batch plants are competing for your order. The national average is a starting point, not a quote.\n\n" +
            "Regional ready-mix pricing in 2026:\n\n" +
            "<ul><li><strong>Southeast</strong> (FL, GA, AL): $125–$145 per yd³</li><li><strong>Midwest</strong> (OH, IN, IL): $135–$155 per yd³</li><li><strong>Southwest</strong> (TX, AZ, NM): $140–$160 per yd³</li><li><strong>Northeast</strong> (NY, MA, PA): $155–$180 per yd³</li><li><strong>West Coast</strong> (CA, WA, OR): $165–$195 per yd³</li></ul>\n\n" +
            "Labor moves the installed price even more. The Northeast and West Coast add 15–35% to installed per-square-foot cost versus the Southeast and Midwest. Island and remote sites can push ready-mix past $250 per yard.\n\n" +
            "The fastest way to a real number: call one local ready-mix supplier and one local contractor. Ten minutes of phone calls beats any national average."
      },
      {
        id: "slab-cost-calculator",
        q: "What does a concrete slab cost calculator actually include?",
        a: "A useful slab cost calculator prices the <strong>whole installed job</strong>, not just the concrete. PourCost breaks the estimate into ten lines: ready-mix concrete, delivery, site prep and excavation, gravel base, forms and edge setup, reinforcement, vapor barrier, placing and finishing labor, control joints, and curing compound and sealer.\n\n" +
            "That matters because concrete material is usually only <strong>19%</strong> of the bill. Labor is around <strong>41%</strong>. A calculator that returns a cubic yard count leaves out the three largest cost drivers, which is why published \"$6 per square foot\" figures routinely disagree with what a contractor actually charges.\n\n" +
            "The PourCost slab estimator also returns a <strong>low, typical and high</strong> band for every line instead of one false-precise number, and every rate can be overridden with your own local quote."
      },
      {
        id: "slab-total-cost",
        q: "What is the total cost of a 20 x 20 concrete slab?",
        a: "A 20 x 20 ft slab at 4 inches with a 4-inch gravel base, welded wire mesh and a broom finish costs <strong>$3,200 to $4,400</strong> in 2026, with <strong>$4,417</strong> as the typical figure — about <strong>$11.04 per square foot</strong> installed.\n\n" +
            "Here is where that $4,417 goes:\n\n" +
            "<ul>\n<li>Ready-mix concrete (5.43 yd³ at $155/yd³) — <strong>$842</strong></li>\n<li>Delivery — <strong>$120</strong></li>\n<li>Site prep and excavation — <strong>$340</strong></li>\n<li>Gravel sub-base — <strong>$500</strong></li>\n<li>Forms and edge setup — <strong>$180</strong></li>\n<li>Reinforcement — <strong>$180</strong></li>\n<li>Vapor barrier — <strong>$80</strong></li>\n<li>Placing and finishing labor — <strong>$1,800</strong></li>\n<li>Control joints — <strong>$175</strong></li>\n<li>Curing compound and sealer — <strong>$200</strong></li>\n</ul>\n\n" +
            "The number moves fast: a 5-inch slab, a stamped finish or a pump truck will each add several hundred dollars."
      },
      {
        id: "slab-cost-vs-contractor",
        q: "Should I use the calculator's estimate or hire a contractor?",
        a: "Use the estimate to <strong>plan and to check a quote</strong> — not as the final price. A calculator tells you what a job of this size should cost; a contractor tells you what it costs <em>your</em> job.\n\n" +
            "The estimate is strongest for a straightforward slab on accessible ground with no demolition and no tricky excavation. It is weakest when the site is tight, the access is bad, there is significant slope or poor soil, or the finish is decorative.\n\n" +
            "The practical use is arithmetic: when a contractor quotes $6,900 for a 20 x 20 slab, divide by 400 sq ft and you get $17.25 per square foot. Compare that against the $11.04 the model produces and you can see whether the gap is explained by scope — extra excavation, a thicker base, a pump truck, a stamped finish — or is simply margin.\n\n" +
            "Always get three quotes and compare them <strong>line by line</strong>, not just on the total."
      },
      {
        id: "slab-cost-varies",
        q: "Why do concrete slab costs vary so much between contractors?",
        a: "Three things move the price: <strong>scope, access and geography</strong>.\n\n" +
            "Scope is the biggest lever. \"$6 per square foot\" usually means concrete and labor only — no base, no forms, no reinforcement, no joints, no curing compound, no excavation. Add those and the same slab is $11.\n\n" +
            "Access decides whether a truck can reach the pour. A short-load fee of $120–$200 applies when the load is under 10 yards, and a pump truck runs $450–$900. On a backyard with a 30-foot gate, those charges are real.\n\n" +
            "Geography moves ready-mix from $125/yd³ in the Southeast to $195/yd³ on the West Coast, and pushes installed labor 15–35% higher in the Northeast and West Coast than in the Southeast and Midwest.\n\n" +
            "Finally, a contractor buying concrete at volume gets a better rate than one placing a single slab — which is exactly why one-bag pricing and one-load pricing are the same thing."
      },
      {
        id: "slab-quote-compare",
        q: "How do I compare two concrete slab quotes fairly?",
        a: "Put both quotes on the <strong>same line items</strong> before you compare totals. Most disagreements are scope differences dressed up as price differences.\n\n" +
            "Check for these seven lines on every quote: concrete (cubic yards and PSI), delivery and any short-load or pump charge, excavation and site prep, gravel base depth, forms and edge setup, reinforcement (size and spacing), labor, control joints, and curing compound or sealer.\n\n" +
            "Then verify the quantities. A 20 x 20 slab at 4 inches needs <strong>5.43 cubic yards</strong> including waste, not 5. A 400 sq ft base at 4 inches needs about <strong>1.48 cubic yards</strong> of gravel. If a quote is short on yards, it is short on concrete, and a short pour is a failed pour.\n\n" +
            "Two quotes that both include the same ten lines should land within about <strong>15% of each other</strong> in a competitive market. If one is double, the gap is scope or margin, not price."
      },
      {
        id: "slab-materials-list",
        q: "What materials do I need for a concrete slab?",
        a: "A complete residential slab needs eight things, and most of them are forgotten until the day of the pour.\n\n" +
            "<ul>\n<li><strong>Concrete</strong> — 3,000 PSI for interior and sheltered work, 3,500 PSI for standard exterior residential, 4,000 PSI with air entrainment for driveways and freeze-thaw climates</li>\n<li><strong>Gravel base</strong> — 4 inches of compacted crushed stone (400 sq ft needs about 1.48 cubic yards)</li>\n<li><strong>Vapor barrier</strong> — 6 mil poly or 10 mil vapor retarder, laid over the base</li>\n<li><strong>Reinforcement</strong> — #4 rebar at 18 inches on center both ways, or 6 x 6 welded wire mesh</li>\n<li><strong>Forms</strong> — 2 x 4 lumber or rigid forms for the edges</li>\n<li><strong>Control joint tooling</strong> — a groover, or saw cuts within a few hours of finishing</li>\n<li><strong>Curing compound</strong> — applied once the surface hardens enough</li>\n<li><strong>Base and form stakes</strong> — and a plate compactor or roller</li>\n</ul>\n\n" +
            "The PourCost slab calculator prices the first seven, so the material list and the cost estimate agree with each other."
      }
    ],
    "concrete-calculator": [
      {
        id: "cc-what",
        q: "How do I calculate the amount of concrete I need?",
        a: "Multiply the three dimensions of the pour together, then convert to the unit you will buy in.\n\n" +
            "<span class=\"formula\">Cubic feet = Length (ft) x Width (ft) x Thickness (ft)<br>Cubic yards = Cubic feet ÷ 27<br>Cubic yards = (sq ft x thickness in) ÷ 324</span>\n\n" +
            "The 324 shortcut combines the 12-inch-to-foot conversion and the 27 cubic feet in a cubic yard into one step. For a 20 x 20 ft slab at 4 inches: (400 x 4) ÷ 324 = 4.94 cubic yards.\n\n" +
            "Then add <strong>5 to 10% for waste</strong> — spillage, uneven subgrade, over-excavation, and the mix left in the chute. NRMCA recommends ordering at least 4 to 10% more than the plan volume. Round up to the next quarter yard.\n\n" +
            "For shapes other than a rectangle, split the pour into rectangles and add the results."
      },
      {
        id: "cc-50lb-bag",
        q: "How many cubic feet is a 50 lb bag of concrete?",
        a: "A 50 lb bag of premixed concrete yields about <strong>0.375 cubic feet</strong> — roughly <strong>72 bags per cubic yard</strong>.\n\n" +
            "Full yield table for standard premix bag sizes:\n\n" +
            "<ul><li><strong>40 lb</strong> — 0.30 ft³ per bag · 90 bags per yd³</li><li><strong>50 lb</strong> — 0.375 ft³ per bag · 72 bags per yd³</li><li><strong>60 lb</strong> — 0.45 ft³ per bag · 60 bags per yd³</li><li><strong>80 lb</strong> — 0.60 ft³ per bag · 45 bags per yd³</li></ul>\n\n" +
            "The largest bag is always the best value per cubic foot — an 80 lb bag gives you 0.60 ft³ of concrete for fewer trips than two 40 lb bags, and it is the size most hardware stores stock in pallet quantity.\n\n" +
            "<strong>Check the yield on your actual bag.</strong> These are the standard published yields, but some brands and fast-setting mixes yield less. The spec sheet on the bag is authoritative."
      },
      {
        id: "cc-yard-or-bags",
        q: "Should I order concrete by the yard from a ready mix company or just use bags?",
        a: "Use bags below about <strong>1 cubic yard</strong> — roughly 45 bags of 80 lb mix. Use ready-mix above that.\n\n" +
            "The practical differences:\n\n" +
            "<ul><li><strong>Cost per cubic yard is nearly identical.</strong> A yard of ready-mix at $155 runs about $155; the same yard in 80 lb bags at $6.50 runs about $292. But bags avoid the delivery trip fee and the short-load surcharge that make a small ready-mix order expensive.</li><li><strong>Time is the real difference.</strong> One cubic yard of finished concrete weighs 4,050 lb. Hand-mixing it is a full day for two people plus a mixer rental. A ready-mix pour is about an hour.</li><li><strong>Cold joints.</strong> Hand-mixed pours that take more than a couple of hours often show visible joints where the water content changed between batches.</li><li><strong>Consistency.</strong> Every yard off a truck has the same water-to-cement ratio. Every hand-mixed batch is a guess.</li></ul>\n\n" +
            "The exception is a small pour in a backyard the truck cannot reach. If delivery means a pump truck or a long wheelbarrow haul, bags can still win on total cost even past a cubic yard."
      },
      {
        id: "cc-online-vs-physical",
        q: "What's the difference between an online calculator and a physical construction calculator?",
        a: "A physical construction calculator (the circular disc-and-window type you hang on a belt) does arithmetic fast — it multiplies, divides, and runs trig in your head. It does not know anything about concrete.\n\n" +
            "An online concrete calculator carries the domain knowledge instead:\n\n" +
            "<ul><li>It knows that one cubic yard is 27 cubic feet, and that an 80 lb bag yields 0.60 ft³</li><li>It knows the 324 shortcut, the 81 sq ft coverage rule, and the standard waste allowance</li><li>It knows the thickness, PSI, reinforcement, and joint-spacing conventions</li><li>It carries current regional pricing and can compare ready-mix against bagged mix</li></ul>\n\n" +
            "They are complementary rather than competing. The physical calculator is still faster for mental arithmetic on site — \"what is 400 times 4 over 324?\" — and the online tool is what tells you <em>which</em> numbers to multiply and what the answer means for your order."
      },
      {
        id: "cc-footing-column",
        q: "How much concrete do I need for a footing or a column?",
        a: "The formula is the same, only the shape changes.\n\n" +
            "<strong>Strip footing</strong> (a long narrow pour):\n<span class=\"formula\">Volume = length x width x depth</span>\n\n" +
            "A 10 ft x 2 ft footing at 12 inches deep is 20 cu ft — about 0.74 cubic yards.\n\n" +
            "<strong>Round column or sonotube</strong>:\n<span class=\"formula\">Volume = pi x radius² x height</span>\n\n" +
            "A 12 inch diameter column at 4 feet tall is 3.14 x 1 x 4 = 12.6 cu ft — about 0.46 cubic yards.\n\n" +
            "Two things people forget on columns: add half an inch per side if you are setting the tube in place rather than pouring against a form, and remember a column's weight is what determines the base and footing size — a 12 inch column weighs about 300 lb per foot of height.\n\n" +
            "The calculator on this page handles footings, columns, walls, and stairs directly."
      },
      {
        id: "cc-bag-size",
        q: "What size bag of concrete should I buy?",
        a: "Match the bag to the volume of the job, and match the strength to the job.\n\n" +
            "<ul><li><strong>40 lb</strong> — 0.30 ft³ yield. Best for small patches and footings.</li><li><strong>50 lb</strong> — 0.375 ft³ yield. A middle option when 60 and 80 lb are too heavy to handle.</li><li><strong>60 lb</strong> — 0.45 ft³ yield. A good middle option for DIY work.</li><li><strong>80 lb</strong> — 0.60 ft³ yield. The most common size; heaviest to handle, best value per bag.</li></ul>\n\n" +
            "For strength, choose 3,000 PSI for interior or sheltered work, 3,500 PSI for standard exterior residential, and 4,000 PSI with air entrainment for driveways, garage floors, and freeze-thaw climates.\n\n" +
            "Do not mix bag sizes within one pour. Different mixes and different water contents will show up as visible color and strength differences in the finished surface."
      },
      {
        id: "cc-shapes",
        q: "How do I calculate concrete for a non-rectangular shape?",
        a: "Break the shape into rectangles, calculate each one, then add the volumes together. It is the same arithmetic every time.\n\n" +
            "<strong>L-shaped slab</strong> — split it into a full-length rectangle plus a second rectangle covering the notch:\n<ul><li>Part A = length x width</li><li>Part B = (length − cutout length) x cutout width</li><li>Total area = A + B</li></ul>\n\n" +
            "<strong>Circular pad</strong> — area = π x (diameter ÷ 2)²\n\n" +
            "<strong>Footing</strong> — length x width x depth, and do not forget to add the depth of the footing that sits below the grade line.\n\n" +
            "<strong>Columns</strong> — π x radius² x height. Add a 1/2 inch allowance per side for the forms.\n\n" +
            "<strong>Walls</strong> — length x thickness x height.\n\n" +
            "<strong>Stairs</strong> — width x (run ÷ 2 x rise) for the solid flight, plus the landing block.\n\n" +
            "The calculator on this page handles all of these directly."
      },
      {
        id: "cc-conversion",
        q: "How do I convert between cubic feet, cubic yards, and bags?",
        a: "Three conversions cover almost everything:\n\n" +
            "<ul><li><strong>1 cubic yard = 27 cubic feet</strong></li><li><strong>1 cubic yard = 90 bags of 40 lb, 72 of 50 lb, 60 of 60 lb, or 45 of 80 lb</strong></li><li><strong>1 cubic yard covers 324 ÷ thickness(inches) square feet</strong></li></ul>\n\n" +
            "So 1 cubic yard spreads over 81 sq ft at 4 inches, 65 sq ft at 5 inches, 54 sq ft at 6 inches, and 41 sq ft at 8 inches.\n\n" +
            "To convert bag counts to weight, multiply bags by bag size — 45 bags of 80 lb is 3,600 lb, which is the weight of one cubic yard of normal-weight concrete. Around 150 lb per cubic foot is the standard density for structural concrete; lightweight mixes run 90–120 lb per cubic foot, and you must check the bag's published yield for anything non-standard."
      },
      {
        id: "standard-thickness",
        q: "What is the standard thickness of concrete?",
        a: "There is no single standard, because thickness follows load. The residential standard is <strong>4 inches</strong>, and it covers most work:\n\n" +
            "<ul><li><strong>3.5–4 in</strong> — walkways, garden paths, and light pads</li><li><strong>4 in</strong> — patios, shed pads, AC pads, and residential floors (the common standard)</li><li><strong>5 in</strong> — driveways and garage floors taking passenger cars</li><li><strong>6 in</strong> — heavy vehicle driveways, RV and boat pads, commercial slabs</li><li><strong>8 in</strong> — post-tensioned, heavily loaded, or industrial slabs</li></ul>\n\n" +
            "Two anchors on this. The IRC (R506.1) sets a <strong>3.5-inch minimum</strong> for slab-on-grade floors in habitable space, and most jurisdictions amend that to 4 inches. And ACI 330R-08 puts it bluntly: <em>\"As a practical matter, there is no benefit in building slabs less than 4 in. (100 mm) thick.\"</em>\n\n" +
            "Thickness is the cheapest structural upgrade available — bending capacity scales with the square of thickness, so going from 4 to 6 inches is 50% more concrete but roughly 2.25× the bending resistance."
      },
      {
        id: "cc-cubic-yards",
        q: "How many cubic yards of concrete do I need?",
        a: "Divide the plan area by the coverage rate for your slab thickness. One cubic yard of concrete covers:\n\n" +
            "<ul>\n<li><strong>81 sq ft</strong> at 4 inches thick</li>\n<li><strong>65 sq ft</strong> at 5 inches</li>\n<li><strong>54 sq ft</strong> at 6 inches</li>\n<li><strong>41 sq ft</strong> at 8 inches</li>\n</ul>\n\n" +
            "So a 400 sq ft slab at 4 inches needs 400 ÷ 81 = <strong>4.94 cubic yards</strong>. The same calculation in one step, using thickness in inches, is:\n\n" +
            "<span class=\"formula\">Cubic yards = (square feet × thickness in inches) ÷ 324</span>\n\n" +
            "Then add <strong>5 to 10% for waste</strong> — spillage, uneven subgrade and the mix left in the chute — and round up to the next quarter yard. A 400 sq ft slab at 4 inches comes to <strong>5.43 cubic yards</strong> ordered. Ready-mix plants sell in quarter-yard and half-yard increments, so ask for 5.5."
      },
      {
        id: "cc-metric",
        q: "How do I calculate concrete in metric units?",
        a: "Switch the calculator to metric and it handles the conversion for you, but the underlying shortcut is worth knowing.\n\n" +
            "<span class=\"formula\">Cubic metres = length (m) × width (m) × thickness (m)<br>Cubic yards = cubic metres × 1.308</span>\n\n" +
            "One cubic metre of concrete covers <strong>13.1 square metres</strong> at 10 cm thick, <strong>10.5 m²</strong> at 12.5 cm and <strong>8.7 m²</strong> at 15 cm.\n\n" +
            "For example, a 6.1 m × 6.1 m slab at 10 cm: 6.1 × 6.1 × 0.10 = 3.72 m³, which is <strong>4.87 cubic yards</strong> — the same answer the imperial inputs give.\n\n" +
            "Bag counts work the same way. One cubic metre needs <strong>54 bags</strong> of 80 lb mix, <strong>62 bags</strong> of 60 lb, <strong>75 bags</strong> of 50 lb, or <strong>90 bags</strong> of 40 lb. Metric and imperial are the same pour — only the labels change."
      },
      {
        id: "cc-triangle",
        q: "How much concrete do I need for a triangular slab?",
        a: "A triangle's plan area is simply <strong>base × height ÷ 2</strong>, then multiply by thickness for volume.\n\n" +
            "<span class=\"formula\">Area (sq ft) = base (ft) × height (ft) ÷ 2<br>Volume (cu ft) = area × thickness (ft)</span>\n\n" +
            "A triangular pad with a 20 ft base and a 12 ft height gives 20 × 12 ÷ 2 = <strong>120 sq ft</strong> of plan area. At 4 inches thick that is 120 × 0.333 = 40 cu ft, or <strong>1.48 cubic yards</strong> — about 73 bags of 80 lb mix with waste.\n\n" +
            "The perimeter differs by triangle type. A symmetric triangle with the apex centred over the base needs 20 + 2 × √(10² + 12²) = <strong>48.3 ft</strong> of edge. A right triangle with the 90° corner at one end needs 20 + 12 + √(20² + 12²) = <strong>52.4 ft</strong>. That edge length drives your formwork cost.\n\n" +
            "The calculator has a <strong>Triangle</strong> mode with both options, and a <strong>Custom</strong> mode if the triangle is only part of the pour."
      },
      {
        id: "cc-multiple-shapes",
        q: "How do I calculate concrete for several separate areas on one site?",
        a: "Calculate each area separately and <strong>add the volumes together</strong>. Every shape has its own formula, but the arithmetic after that is simple addition.\n\n" +
            "A common case: a 20 x 20 ft garage pad plus a 10 x 10 ft stoop. The garage is 400 sq ft and the stoop is 100 sq ft, so 500 sq ft total. At 4 inches that is 500 × 0.333 = 166.7 cu ft = <strong>6.17 cubic yards</strong> before waste, or 6.79 with a 10% allowance.\n\n" +
            "The <strong>Custom</strong> mode in this calculator does exactly this. Add a rectangle, a round pad and a triangle, enter each one's dimensions, and the area, volume and total edge length are summed live. Shared edges between two areas are counted twice in the edge length, because each area still needs its own form unless the two are cast in a single continuous pour.\n\n" +
            "One caution: separate pours on the same site should still be tied together with rebar or a construction joint, and each pour needs its own control joints."
      },
      {
        id: "cc-gravel",
        q: "How much gravel do I need under a concrete slab?",
        a: "A 4-inch compacted crushed stone base is the standard under a residential slab, and the volume follows the same shortcut as the concrete.\n\n" +
            "<span class=\"formula\">Gravel (yd³) = (square feet × base depth in inches) ÷ 324</span>\n\n" +
            "For a 400 sq ft slab at 4 inches: (400 × 4) ÷ 324 = <strong>1.48 cubic yards</strong>. At 6 inches it becomes 2.22 cubic yards. Round up and order roughly half a yard extra — the base gets raked and compacted, and material is lost at the edges.\n\n" +
            "Two things to get right. First, the gravel must be <strong>compacted</strong> — a plate compactor or a rented roller, in two or three passes. Concrete poured over loose fill will crack, and no amount of rebar fixes a settling sub-base. Second, the base is what lets water drain out; the vapor barrier goes on top of the compacted base, then the rebar, then the concrete.\n\n" +
            "The calculator's <strong>Gravel base</strong> tile updates the volume whenever you change the base depth."
      },
      {
        id: "cc-waste-factor",
        q: "How much waste should I add to my concrete order?",
        a: "Order <strong>5 to 10% more</strong> than the calculated volume. NRMCA's guidance is 4 to 10% for any slab with irregular edges, and most contractors order at the upper end.\n\n" +
            "Where the waste comes from: spillage during the pour, uneven subgrade, over-excavation, the mix left in the truck chute, and the fact that a finished slab's true edges rarely match the tape measure exactly.\n\n" +
            "Set the waste factor to:\n\n" +
            "<ul>\n<li><strong>0–5%</strong> for a square, well-measured slab with straight formwork</li>\n<li><strong>10%</strong> for most residential work — the standard default</li>\n<li><strong>15–20%</strong> for irregular shapes, hand-packed forms, or a long access haul where the wheelbarrow loses material</li>\n</ul>\n\n" +
            "Never plan to order the bare calculated volume. Under-ordering means a cold joint in the middle of a slab, which is the single most visible concrete defect there is."
      }
    ],
    "cost-per-square-foot": [
      {
        id: "cpsf-breakdown",
        q: "What makes up the cost of a concrete slab per square foot?",
        a: "For a standard 4-inch residential slab installed in 2026, the money divides roughly like this:\n\n" +
            "<ul><li><strong>Concrete material</strong> — 20–30% ($1.98–$2.50 per sq ft at $155–$160 per yd³)</li><li><strong>Placing and finishing labor</strong> — 45–55% ($3.00–$8.00 per sq ft)</li><li><strong>Site prep, excavation, and forms</strong> — 10–20% ($1.00–$2.50 per sq ft)</li><li><strong>Reinforcement</strong> — 2–15% ($0.20–$2.00 per sq ft)</li><li><strong>Control joints, curing, and sealer</strong> — 3–8% ($0.25–$1.00 per sq ft)</li></ul>\n\n" +
            "The most common misconception is that the concrete is the expensive part. It is not — labor is. That is why a DIY project is genuinely cheaper: you are not buying the 50% of the cost that is crew time.\n\n" +
            "It also explains why size changes the per-square-foot price. Delivery, crew minimums, and form setup are fixed costs, so they weigh heavier on a 100 sq ft pad than on a 1,000 sq ft driveway."
      },
      {
        id: "cpsf-thickness",
        q: "How does thickness change the cost per square foot?",
        a: "The concrete portion scales linearly with thickness. At $160 per cubic yard:\n\n" +
            "<ul><li><strong>4 in</strong> — $1.98 per sq ft of concrete, 81 sq ft per yard</li><li><strong>5 in</strong> — $2.47 per sq ft, 65 sq ft per yard</li><li><strong>6 in</strong> — $2.96 per sq ft, 54 sq ft per yard</li><li><strong>8 in</strong> — $3.95 per sq ft, 41 sq ft per yard</li></ul>\n\n" +
            "Add 10% for waste and those become $2.17, $2.72, $3.26, and $4.34.\n\n" +
            "Because total cost per square foot includes fixed and variable parts, going from 4 to 6 inches raises the total per square foot by less than 50% — the labor and delivery do not double. A 6-inch slab typically lands $1.50–$2.50 per sq ft above a 4-inch slab, not 50% more."
      },
      {
        id: "cpsf-decorative",
        q: "How much more does decorative concrete cost?",
        a: "Decorative finishes add roughly <strong>$3 to $10 per square foot</strong> on top of a standard slab:\n\n" +
            "<ul><li><strong>Smooth trowel</strong> — $0.75–$2.00 per sq ft</li><li><strong>Exposed aggregate</strong> — $2.50–$5.50 per sq ft</li><li><strong>Stamped</strong> — $5.00–$10.00 per sq ft</li><li><strong>Polished / ground</strong> — $6.00–$14.00 per sq ft</li></ul>\n\n" +
            "Stamping roughly doubles the finishing labor, which is why a stamped patio can cost as much as the structural slab beneath it. Add $1–$3 per sq ft for color, and a stain or sealer on top.\n\n" +
            "Budget against the high end. Decorative work is the least forgiving place to cut corners, because a misaligned stamp cannot be corrected without replacing the slab."
      },
      {
        id: "per-yard",
        q: "How much does a yard of concrete cost?",
        a: "Delivered ready-mix runs <strong>$130 to $180 per cubic yard</strong> in most U.S. markets in 2026, with 3,000 PSI mix around $135–$160 and 4,000 PSI around $143–$180. The ready-mix industry's own benchmark survey puts the average selling price near $160 per yard.\n\n" +
            "Four published supplier price lists read in October 2026 showed 3,000 PSI at $127.05–$165.00 per yard and 4,000 PSI at $132.00–$175.00 before tax.\n\n" +
            "Small orders cost more per yard once trip fees land. A single yard delivered runs $195–$295; 6 yards runs $870–$1,170; a full 10-yard truck runs $1,450–$1,950. Suppliers commonly add a <strong>$50–$200 short-load fee</strong> on orders under 4 to 5 yards.\n\n" +
            "Regional spread: the Southeast runs $125–$145 per yard, the Midwest $135–$155, the Southwest $140–$160, the Northeast $155–$180, and the West Coast $165–$195."
      },
      {
        id: "concrete-weight",
        q: "How much does concrete weigh?",
        a: "Normal-weight structural concrete weighs about <strong>150 pounds per cubic foot</strong>. One cubic yard — 27 cubic feet — therefore weighs roughly <strong>4,050 lb</strong>.\n\n" +
            "That is why concrete arrives by truck: a single yard of finished concrete is over two tons, and a full 10-yard load weighs about 40,500 lb.\n\n" +
            "Other densities you may run into:\n\n" +
            "<ul><li><strong>Normal weight:</strong> 145–155 lb/ft³ (typical ready-mix)</li><li><strong>Lightweight:</strong> 90–120 lb/ft³ (used where a lighter slab is needed, such as over a soft sub-base or on an upper floor)</li><li><strong>Heavyweight:</strong> 180–200 lb/ft³ (radiation shielding — rare in residential work)</li></ul>\n\n" +
            "For a 20 × 20 ft slab at 4 inches, that works out to about <strong>20,000 lb</strong> of concrete in the finished slab. Weight is also a planning factor for pump trucks and for confirming that a crew and equipment can handle the pour."
      },
      {
        id: "cpsf-2026",
        q: "How much does concrete cost per square foot in 2026?",
        a: "A fully installed residential concrete slab runs <strong>$6 to $12 per square foot</strong> in 2026. The PourCost model produces a typical figure of <strong>$11.04 per square foot</strong> for a 20 x 20 ft slab at 4 inches with a base, forms, mesh, labor, joints and curing.\n\n" +
            "The spread is not sloppiness — it is scope. At the <strong>$6</strong> end you are usually looking at concrete and placing labor only, with the base, forms, reinforcement, control joints, curing compound and site prep all excluded or billed separately.\n\n" +
            "At the <strong>$12</strong> end you have a thick base, proper forms, rebar, a difficult access, or a decorative finish.\n\n" +
            "The single most useful thing to do with a per-square-foot price is check what it <em>includes</em> before you compare it to another one."
      },
      {
        id: "cpsf-material",
        q: "How much does the concrete material alone cost per square foot?",
        a: "Concrete material alone is about <strong>$2.00 to $3.30 per square foot</strong> at 4 inches thick.\n\n" +
            "The arithmetic: one cubic yard covers 81 sq ft, and ready-mix runs $135 to $175 per cubic yard in 2026. So each square foot costs roughly $1.70 to $2.20 in material, and adding a 10% waste allowance brings the material-only figure to about <strong>$2.00 per square foot</strong>.\n\n" +
            "At 6 inches thick, where one cubic yard only covers 54 sq ft, the material cost rises to roughly <strong>$2.75 to $3.30 per square foot</strong>.\n\n" +
            "If you see a quote that looks competitive but works out to less than $3 per square foot for materials, check whether delivery and labor are included. Most \"$6 per square foot\" figures are really <em>$4 of concrete</em> plus <em>$2 of labor</em>, with everything else left out."
      },
      {
        id: "cpsf-labor",
        q: "What does concrete labor cost per square foot?",
        a: "Placing and finishing concrete runs <strong>$3.00 to $8.00 per square foot</strong>, and that is usually the largest line on the bill. For the reference 20 x 20 slab, labor is <strong>$1,800</strong> of the $4,417 total — <strong>41%</strong>.\n\n" +
            "It is expensive because finishing is not one task. The crew has to place the concrete, screed it flat, bull-float it, edge it, float it again, broom or stamp the surface, cut or groove the control joints, apply the curing compound, and protect the slab while it cures.\n\n" +
            "The rate rises with difficulty. A flat, accessible slab with a broom finish sits at the low end. Stamped concrete, a slope for drainage, or a site the crew cannot reach with a wheelbarrow all push it up.\n\n" +
            "This is why a per-square-foot price is only meaningful when you know whether labor is in it. Concrete is commodity-priced and moves within a narrow band; labor is local, and it is where regional differences of 15–35% come from."
      },
      {
        id: "cpsf-10x10",
        q: "How much does a 10 x 10 concrete slab cost?",
        a: "A 10 x 10 ft slab at 4 inches costs roughly <strong>$1,600 to $2,200</strong> installed in 2026, with about <strong>$10.90 per square foot</strong> typical.\n\n" +
            "The material side is small: 100 sq ft at 4 inches is <strong>1.23 cubic yards</strong>, which is <strong>62 bags of 80 lb mix</strong> — around $400 in bags. Ready-mix for the same volume is about $190 in concrete plus a $120 delivery, and most contractors would order a full yard and have roughly a quarter yard left over.\n\n" +
            "The rest is fixed cost: forms, a base, labor to place and finish, joints and curing. A 10 x 10 slab has proportionally more form and labor per square foot than a 20 x 20, because the setup does not scale down with area.\n\n" +
            "At this size the <strong>ready-mix versus bags</strong> question usually decides the cost. Compare the two directly on the ready-mix page."
      },
      {
        id: "cpsf-20x20",
        q: "How much does a 20 x 20 concrete slab cost?",
        a: "A 20 x 20 ft slab at 4 inches costs <strong>$3,200 to $4,400</strong> installed in 2026 — about <strong>$11.04 per square foot</strong> at the typical rate.\n\n" +
            "The material requirement is 400 sq ft × 4 inches = <strong>5.43 cubic yards</strong> with waste, which is <strong>245 bags of 80 lb mix</strong> or two ready-mix loads. Concrete and delivery together come to roughly $960.\n\n" +
            "The other $3,400 is site prep ($340), gravel base ($500), forms ($180), reinforcement ($180), vapor barrier ($80), labor ($1,800), control joints ($175) and curing compound ($200).\n\n" +
            "Move the slab to 6 inches and you add 1.54 cubic yards of concrete — about $240 — plus more base, more rebar and more formwork. Move it to a stamped finish and add roughly $4,200 for the pattern work alone."
      },
      {
        id: "cpsf-driveway",
        q: "What does concrete cost per square foot for a driveway?",
        a: "A concrete driveway runs <strong>$8 to $14 per square foot</strong> installed, above the range for a patio or pad, because it carries vehicles and is usually thicker.\n\n" +
            "A standard single-car driveway is 10 x 20 ft = 200 sq ft, at <strong>$1,600 to $2,800</strong>. A two-car driveway of 12 x 24 ft = 288 sq ft runs <strong>$2,300 to $4,000</strong>.\n\n" +
            "The premium over a patio comes from three places: <strong>5 to 6 inches</strong> of thickness instead of 4, <strong>#4 or #5 rebar</strong> rather than mesh, and the forms and labor to hold a long narrow pour with proper joints.\n\n" +
            "There is also a length limit. A driveway should be poured in sections of roughly <strong>10 to 12 feet</strong>, with a control joint between each. A single 40-foot pour without joints will crack across the middle, no matter how well it is reinforced."
      },
      {
        id: "cpsf-patio",
        q: "What does concrete cost per square foot for a patio?",
        a: "A patio runs <strong>$7 to $12 per square foot</strong> installed, at the lower end of the concrete range because a patio carries no vehicles.\n\n" +
            "A 12 x 12 ft patio = 144 sq ft at <strong>$1,000 to $1,700</strong>. A 16 x 20 ft patio = 320 sq ft at <strong>$2,200 to $3,800</strong>. A 20 x 20 ft patio = 400 sq ft at <strong>$2,800 to $4,400</strong>.\n\n" +
            "Patios are usually <strong>4 inches</strong> thick, on a 4-inch compacted base, with welded wire mesh. Where the patio abuts the house, you often see a thickened edge — that is where frost and rain get in, and it is worth the extra concrete.\n\n" +
            "A stamped or colored patio adds <strong>$5 to $12 per square foot</strong> on top. The material is nearly the same; what you are paying for is the labor to stamp and seal the surface."
      },
      {
        id: "cpsf-varies",
        q: "Why do published concrete prices per square foot disagree with each other?",
        a: "Because the prices are quoting different scopes, and the difference is almost always in what is <strong>excluded</strong> rather than in what is included.\n\n" +
            "The two figures you will see most often are around <strong>$6 per square foot</strong> and around <strong>$11 per square foot</strong>. Both can be right. The $6 figure is typically concrete and placing labor only. The $11 figure adds a 4-inch compacted gravel base, forms and edge setup, reinforcement, a vapor barrier, control joints, curing compound and sealer, and site prep.\n\n" +
            "Neither is wrong; they are different products. The practical failure is comparing a scoped-out quote against a scoped-in one and declaring the contractor expensive.\n\n" +
            "When you put quotes side by side, list the same ten line items for each and compare the totals. If two contractors quote the same scope, they should land within about <strong>15%</strong> of each other in a competitive market."
      }
    ],
    "ready-mix-vs-bags": [
      {
        id: "rmvb-decide",
        q: "Is it cheaper to buy ready-mix or bags of concrete?",
        a: "For anything under 1 cubic yard, bags are usually cheaper overall. Above 1 cubic yard, ready-mix wins on both cost and effort.\n\n" +
            "The math on 1 cubic yard:\n\n" +
            "<ul><li><strong>Ready-mix:</strong> $155/yd³ material, but a single delivered yard runs $195–$295 after trip charges and short-load fees</li><li><strong>Bags:</strong> 45 bags of 80 lb at $6.50 = $292 in material — then you mix, haul, and pour 3,600 lb by hand</li></ul>\n\n" +
            "The material cost is nearly identical. The difference is labor and equipment, and that difference grows fast with volume. A ready-mix truck delivers, places, and screeds in minutes what takes several people half a day to do by hand.\n\n" +
            "The exception: a small pour in a backyard the truck cannot reach. If delivery means a pump truck or a long wheelbarrow haul, bags can still win on total cost even past a cubic yard."
      },
      {
        id: "rmvb-breakpoint",
        q: "What is the breakeven point between bags and ready-mix?",
        a: "The breakeven sits around <strong>1 cubic yard</strong> — 45 bags of 80 lb mix.\n\n" +
            "Below 1 yd³, bags cost less because you avoid a delivery trip fee, a short-load fee, and a minimum order. Between 1 and 2 yd³, ready-mix is roughly comparable on material but wins decisively on time. Above 2 yd³, ready-mix is the only sensible option — the labor savings alone are worth hundreds of dollars, and hand-mixing that volume reliably produces cold joints.\n\n" +
            "A practical rule of thumb:\n\n" +
            "<ul><li><strong>Under 1 yd³</strong> — bags. A 10 x 10 slab at 4 inches.</li><li><strong>1 to 2 yd³</strong> — either works; compare the delivered quote against bags plus a mixer rental.</li><li><strong>Over 2 yd³</strong> — ready-mix, with a pump if the truck cannot reach the forms.</li></ul>\n\n" +
            "Do not forget the time cost. A one-cubic-yard hand mix is a full day of work for two people plus a mixer rental. A one-cubic-yard ready-mix pour is about an hour."
      },
      {
        id: "rmvb-mix",
        q: "Can I mix concrete myself instead of using bags?",
        a: "You can, and for medium-sized pours it is sometimes the best value. You need a drum mixer, Portland cement, sand, gravel, and water.\n\n" +
            "The classic <strong>1:2:3 mix</strong> means 1 part cement, 2 parts sand, 3 parts aggregate by weight, which yields roughly 3,000 PSI after adding enough water to reach a workable consistency.\n\n" +
            "Three things decide whether hand-mixing works:\n\n" +
            "<ol><li><strong>Volume</strong> — mixing by hand is realistic to about 1 cubic yard per day with a proper machine. Beyond that you are building a production line.</li><li><strong>Consistency</strong> — every batch must get the same water. This is the hard part, and inconsistent water means inconsistent strength.</li><li><strong>Your back</strong> — one cubic yard of finished concrete weighs about 3,600 lb. That is a lot of lifting.</li></ol>\n\n" +
            "For anything under a cubic yard, bags are effectively hand-mixing with the mixing already done for you, and they are usually the better choice."
      },
      {
        id: "bags-vs-readymix",
        q: "Should I use ready-mix or bags of concrete?",
        a: "Use bags below about <strong>1 cubic yard</strong> (roughly 45 bags of 80 lb mix). Use ready-mix above that.\n\n" +
            "Above a cubic yard, ready-mix is almost always cheaper per yard and far less work. At $155 per cubic yard delivered, a yard of concrete costs about $300 in material. The same yard in 80 lb bags at $6.50 each runs about $290 in bags — and then you still have to mix it, haul it, and pour it yourself, and a yard of finished concrete weighs about 3,600 lb.\n\n" +
            "The comparison changes once delivery fees enter. A single yard delivered costs $195–$295 after trip charges, and plants add a $50–$200 short-load fee below 4 to 5 yards. So for a small pour in a hard-to-reach backyard, bags can still win on total cost — they just take far longer.\n\n" +
            "The practical rule: <strong>bags for anything under 1 yd³, ready-mix from 1 to 2 yd³, and ready-mix with a pump beyond that</strong> if the truck cannot reach the forms."
      },
      {
        id: "rmvb-cost",
        q: "Is it cheaper to buy ready-mix concrete or bags?",
        a: "For a pour of <strong>1 cubic yard or more</strong>, ready-mix is almost always cheaper once delivery is counted. Below that, bags win.\n\n" +
            "The material prices are close: a yard of ready-mix at $155 costs $155, while the same yard in 80 lb bags at $6.50 each (45 bags) costs <strong>$292</strong>. But a ready-mix order also carries <strong>$80 to $180 for delivery</strong> and a <strong>$60 to $200 short-load fee</strong> when the order is under 10 yards. A small ready-mix order can land near $400 all-in, which is still less than the bags once you count your time.\n\n" +
            "The real comparison is labor. One cubic yard of finished concrete weighs <strong>4,050 lb</strong>. Hand-mixing that is a full day for two people plus a mixer rental.\n\n" +
            "So: <strong>bags below about 1 cubic yard</strong>, ready-mix above it — unless access is the deciding factor."
      },
      {
        id: "rmvb-10x10",
        q: "Should I use bags or ready-mix for a 10 x 10 slab?",
        a: "A 10 x 10 ft slab at 4 inches is <strong>1.23 cubic yards</strong> — right on the line where the decision is genuinely close.\n\n" +
            "<strong>With bags</strong> you need <strong>62 bags of 80 lb mix</strong> (98 bags of 50 lb, 133 of 60 lb, 173 of 40 lb). At $6.50 per 80 lb bag that is about <strong>$403</strong>, plus a wheelbarrow, a mixing tub, and about five to six hours of work for two people across a weekend.\n\n" +
            "<strong>With ready-mix</strong> you order 1.5 cubic yards with waste. That is roughly $232 in concrete plus $120 delivery, plus a <strong>$60 short-load fee</strong> because it is under 10 yards — call it <strong>$410</strong> delivered to the curb, and the crew has it placed in under an hour.\n\n" +
            "The money is a wash. The decision is <strong>time and access</strong>: if a mixer truck can reach the pour, buy ready-mix; if it cannot get through a gate, bags win because the truck's short-load and access charges will exceed the difference."
      },
      {
        id: "rmvb-20x20",
        q: "Should I use bags or ready-mix for a 20 x 20 slab?",
        a: "Ready-mix, without question. A 20 x 20 ft slab at 4 inches is <strong>5.43 cubic yards</strong> — and that is <strong>245 bags of 80 lb mix</strong>.\n\n" +
            "At $6.50 a bag, 245 bags is <strong>$1,593</strong>, and you would be mixing roughly 20,000 lb of concrete by hand and wheelbarrowing it to the pour. Realistically that is two full days for two people plus a rental mixer, and bagged concrete has a limited working time once mixed.\n\n" +
            "Ready-mix for the same slab is about <strong>$842</strong> in concrete and <strong>$120</strong> for delivery — one truck load, placed in well under an hour.\n\n" +
            "The gap is not close. The crossover point is around <strong>1 cubic yard</strong>: below that, bags save money and time; above it, a truck is faster, cheaper and produces a more consistent slab."
      },
      {
        id: "rmvb-bag-count",
        q: "How many bags of concrete equal one cubic yard?",
        a: "It depends on the bag size:\n\n" +
            "<ul>\n<li><strong>45 bags</strong> of 80 lb — the most common size</li>\n<li><strong>60 bags</strong> of 60 lb</li>\n<li><strong>72 bags</strong> of 50 lb</li>\n<li><strong>90 bags</strong> of 40 lb</li>\n</ul>\n\n" +
            "The reason is yield. An 80 lb bag yields <strong>0.60 cubic feet</strong>, and 27 × 0.60 = 16.2 cu ft per bag, which divides into 27 cu ft exactly 45 times. A 50 lb bag yields 0.375 cu ft, so you need 72.\n\n" +
            "Always check the published yield on your actual bag. Standard premix follows the numbers above, but some fast-setting and specialty mixes yield less, and a lighter-weight mix changes the count entirely.\n\n" +
            "For weight: 45 bags of 80 lb is 3,600 lb, which is exactly one cubic yard of normal-weight concrete at about 150 lb per cubic foot."
      },
      {
        id: "rmvb-short-load",
        q: "What is a short-load fee for concrete delivery?",
        a: "A short-load fee is the extra charge a ready-mix plant adds when your order is <strong>less than 10 cubic yards</strong> — because the truck still has to come out, and the driver still has to wash it out afterwards.\n\n" +
            "It typically runs <strong>$60 to $200</strong> on top of the base delivery charge of <strong>$80 to $180</strong>. For most plants a single yard is the practical minimum.\n\n" +
            "This fee is the single most important number in the bags-versus-ready-mix comparison. A one-yard order with a $120 short-load fee and $80 delivery comes to $200 in access charges alone — enough to eat the entire saving on the concrete itself.\n\n" +
            "Two ways to avoid it: order <strong>at least 10 yards</strong> if you genuinely need that much concrete, or keep the pour small and use bags. A third option is to schedule a <strong>shared load</strong> with another job in your area, which some plants offer specifically for small residential pours."
      },
      {
        id: "rmvb-mix-design",
        q: "What concrete mix design should I order?",
        a: "Match the mix to the exposure and the load.\n\n" +
            "<ul>\n<li><strong>2,500 PSI</strong> — interior work, footings, fill, and anything that will be covered or protected. Not for any exterior flat work in a freeze-thaw climate.</li>\n<li><strong>3,000 PSI</strong> — the standard for interior slabs and warm, dry climates.</li>\n<li><strong>3,500 PSI</strong> — the most common residential exterior mix. Good default for patios and pads.</li>\n<li><strong>4,000 PSI with air entrainment</strong> — driveways, garage floors, and anywhere the slab will see freeze-thaw cycles. Air entrainment is what makes the concrete survive frost; it is not optional in a cold climate.</li>\n<li><strong>4,000 PSI or higher</strong> — warehouse floors, machine pads, and commercial work.</li>\n</ul>\n\n" +
            "For bagged mix you will see the same numbers on the bag. Add <strong>fiber mesh</strong> for crack control in a slab with no rebar — it is not a substitute for reinforcement, but it reduces plastic shrinkage cracking in the first 24 hours."
      },
      {
        id: "rmvb-hand-mix",
        q: "How long can you hand-mix concrete before it is unusable?",
        a: "Bagged concrete has a working time of roughly <strong>30 to 45 minutes</strong> after mixing. Once it starts to stiffen you cannot add water to make it workable again without weakening it.\n\n" +
            "That constraint is what makes a bagged pour a planning problem rather than a shopping problem. At 62 bags for a 10 x 10 slab, you need roughly five to six hours of mixing and placing — longer than one working time. The realistic approach is to mix in small batches and place each batch immediately, which means working continuously.\n\n" +
            "If you do have to add water to keep up, add it <strong>sparingly</strong> and mix it in completely. Adding a half gallon of water per bag reduces the compressive strength by roughly 300 psi and raises the shrinkage cracking risk. Never add more than about half a gallon per bag, and never add water after the concrete has begun to set.\n\n" +
            "Cold joints — where two batches meet — are the visible result. They are permanent and they are the reason a mixer truck costs what it costs."
      },
      {
        id: "rmvb-strength",
        q: "Are bagged and ready-mix concrete the same strength?",
        a: "A bag labelled 3,000 PSI and a truck load of 3,000 PSI are designed to reach the same compressive strength at 28 days — but a hand-mixed bagged pour rarely achieves it in practice.\n\n" +
            "Three things work against you. First, <strong>water control</strong>: a plant mixes to a tight water-to-cement ratio, and hand mixing relies on your judgment, which usually means more water. Second, <strong>mixing consistency</strong>: every bagged batch varies slightly, and the variation shows as color and strength differences across the finished surface. Third, <strong>incomplete consolidation</strong>: air voids left in hand-mixed concrete reduce strength and let water in.\n\n" +
            "None of this matters much for a shed pad on stable ground. It matters a great deal for a driveway, a garage floor or anything carrying a load.\n\n" +
            "A reasonable rule: use bags for anything under a cubic yard that carries no structural load, and use ready-mix for anything that will be driven on, walked on heavily, or that spans a gap."
      }
    ],
    "driveway-cost": [
      {
        id: "driveway-cost",
        q: "How much does a concrete driveway cost?",
        a: "A residential concrete driveway costs <strong>$6 to $12 per square foot</strong> installed in 2026, and most projects land between $7 and $10.\n\n" +
            "Typical totals:\n\n" +
            "<ul><li>10 x 20 driveway (200 sq ft): $1,200–$2,400</li><li>12 x 24 driveway (288 sq ft): $1,700–$3,500</li><li>12 x 40 two-car driveway (480 sq ft): $2,900–$5,800</li><li>20 x 50 driveway (1,000 sq ft): $6,000–$12,000</li></ul>\n\n" +
            "Driveways price above patios for three reasons: they are thicker (5–6 inches rather than 4), they need rebar instead of light mesh, and the base is deeper (6 inches of compacted stone rather than 4).\n\n" +
            "The apron where the driveway meets the street is often the most expensive part of the job, because it is thicker, stronger, and sometimes a permit is involved — some jurisdictions require an approved detail at the right of way."
      },
      {
        id: "driveway-length",
        q: "How much does a longer driveway cost per square foot?",
        a: "Longer driveways cost <strong>less per square foot</strong>, because delivery, crew setup, and mobilization are spread over more area.\n\n" +
            "A 12 x 20 driveway (240 sq ft) may land near $8.50–$15.00 per sq ft. The same crew pouring a 12 x 60 driveway (720 sq ft) typically lands nearer $6.50–$12.50 per sq ft. The absolute total goes up; the rate per square foot goes down.\n\n" +
            "This is the same effect that makes small slabs expensive. A short driveway also carries proportionally more cost for the truck trip, forms, and the crew minimum — there is a practical minimum charge for any concrete pour, and a 150 sq ft job can trip it.\n\n" +
            "If you are comparing quotes, compare the per-square-foot rate on the quote, not just the total. A low total on a small job can still be a high rate."
      },
      {
        id: "driveway-repair",
        q: "Should I resurface my concrete driveway or replace it?",
        a: "Resurface when the slab is sound but the surface is worn; replace when the slab itself is failing.\n\n" +
            "<strong>Resurfacing</strong> makes sense when the concrete underneath is solid, the cracks are hairline, and the problem is surface spalling, scaling, or discoloration. A 1 to 2 inch overlay costs about <strong>$3.60 per square foot</strong>, roughly $2,160 for a 600 sq ft driveway. It adds about 25% to the total project cost including prep, and it extends the life of a sound slab by several years.\n\n" +
            "<strong>Replace</strong> when you have deep cracking, heaving or settling, spalling that goes through the full depth, or a base failure. Removing and hauling off an old 4-inch slab runs about $4 per square foot, and a full replacement often costs less than a resurface plus the repairs you would need anyway.\n\n" +
            "The cost of resurfacing a driveway runs about <strong>$3.60 per square foot</strong> in 2026, with most jobs landing between $2,200 and $6,200 depending on size, prep, and whether the old slab is removed first. Get a structural opinion before resurfacing over a failing slab — a new surface over a bad base fails too, and sooner."
      },
      {
        id: "curing",
        q: "How long after pouring can I walk or drive on a concrete slab?",
        a: "Concrete gains most of its strength in the first week, but design strength is measured at 28 days.\n\n" +
            "<ul><li><strong>24–48 hours</strong> — keep foot traffic off. Walking is usually fine after 24–48 hours.</li><li><strong>7 days</strong> — typical for passenger vehicles. Some municipalities allow traffic after 7 days when testing confirms 2,500 psi.</li><li><strong>28 days</strong> — full specified strength, the point at which you can park heavy equipment, back a loaded trailer, or place a hot tub.</li></ul>\n\n" +
            "Keep the slab damp during the first 3 to 7 days. Apply curing compound as soon as the surface water is gone — it slows evaporation and keeps the hydration reaction going. Curing is not a formality: a slab that dries out too early loses surface strength, and that is where you see the dusty, flaky top that shows up six months later."
      },
      {
        id: "driveway-cost-per-sqft",
        q: "How much does a concrete driveway cost per square foot?",
        a: "A concrete driveway runs <strong>$8 to $14 per square foot</strong> installed in 2026, above a patio because it is thicker, reinforced and carries vehicles.\n\n" +
            "Typical totals:\n\n" +
            "<ul>\n<li><strong>Single car, 10 x 20 ft</strong> (200 sq ft) — $1,600 to $2,800</li>\n<li><strong>Two car, 12 x 24 ft</strong> (288 sq ft) — $2,300 to $4,000</li>\n<li><strong>Two car with turnaround</strong> (600 sq ft) — $4,800 to $8,400</li>\n</ul>\n\n" +
            "The work is in the edges, not the middle. A driveway is poured in <strong>10 to 12 foot sections</strong> with a control joint between each, so the formwork, jointing and edge finishing are what drive the cost per square foot up.\n\n" +
            "Use the driveway cost calculator on this page to price your own dimensions."
      },
      {
        id: "driveway-sizes",
        q: "How much does a concrete driveway cost for common sizes?",
        a: "Here are 2026 installed estimates for the sizes people actually order:\n\n" +
            "<ul>\n<li><strong>10 x 20 ft</strong> single car, 200 sq ft — <strong>$1,600 to $2,800</strong></li>\n<li><strong>12 x 20 ft</strong> single car wide, 240 sq ft — <strong>$1,900 to $3,400</strong></li>\n<li><strong>12 x 24 ft</strong> two car, 288 sq ft — <strong>$2,300 to $4,000</strong></li>\n<li><strong>20 x 20 ft</strong> two car with room to open doors, 400 sq ft — <strong>$3,200 to $5,600</strong></li>\n<li><strong>12 x 40 ft</strong> RV or trailer parking, 480 sq ft — <strong>$3,800 to $6,700</strong></li>\n</ul>\n\n" +
            "The range widens with thickness. At 5 inches with #4 rebar you are at the low end; at 6 inches with #5 rebar and a thicker base, at the high end.\n\n" +
            "One number that surprises people: <strong>a turnaround pad costs much more per square foot</strong> than the driveway itself, because it is a wide slab with forms on three sides."
      },
      {
        id: "driveway-thickness",
        q: "How thick should a concrete driveway be?",
        a: "<strong>5 to 6 inches</strong> for a driveway carrying passenger vehicles. That is the standard, and it is thicker than a patio for a reason: a vehicle load is far higher than a foot traffic load, and a thin slab over a soft base deflects and cracks across its span.\n\n" +
            "<ul>\n<li><strong>4 in</strong> — walkways and garden paths only</li>\n<li><strong>5 in</strong> — passenger car driveways and garage floors</li>\n<li><strong>6 in</strong> — heavy vehicles, RVs, dumpsters, and any slab over fill</li>\n<li><strong>8 in</strong> — post-tensioned, commercial, or engineered loads</li>\n</ul>\n\n" +
            "Going from 5 to 6 inches is about <strong>$240 more</strong> of concrete on a 288 sq ft driveway — cheap insurance. Going the wrong way and pouring 4 inches on a driveway is the expensive mistake, because a replacement means breaking it out.\n\n" +
            "The thickness only performs if the base is compacted and the slab is reinforced. See the rebar guidance for spacing."
      },
      {
        id: "driveway-rebar",
        q: "Do I need rebar in a concrete driveway?",
        a: "Yes. A driveway is the most common residential slab where reinforcement is genuinely required, because it spans, it carries concentrated vehicle loads, and it is often poured over disturbed fill.\n\n" +
            "The standard detail is <strong>#4 rebar at 18 inches on center, both ways</strong>, for a 5 to 6 inch slab. For a 6 inch slab carrying heavier loads, step up to <strong>#5 at 12 inches on center</strong>.\n\n" +
            "Reinforcement does not stop a slab from cracking — a slab will crack. What it does is <strong>hold the crack together</strong> so the two halves stay interlocked and the surface stays level and watertight. Without it, a crack opens into a gap that collects water and ravel.\n\n" +
            "Two practical points. Rebar goes in the <strong>bottom third</strong> of the slab on chairs, with at least <strong>2 inches of cover</strong> from the edge. And a <strong>driveway needs no extra joint beyond the control joints</strong> — a longitudinal joint down the middle of a 12-foot-wide drive is not required."
      },
      {
        id: "driveway-replace",
        q: "How much does it cost to remove and replace a concrete driveway?",
        a: "Tearing out and replacing an existing driveway costs roughly <strong>15 to 30% more</strong> than pouring a new one — about <strong>$2,000 to $3,200</strong> for a 12 x 24 ft two-car driveway in 2026.\n\n" +
            "The added cost is demolition: sawing the slab into liftable pieces, breaking it out, hauling it away and disposing of it runs <strong>$6 to $12 per square foot</strong> of slab. On 288 sq ft that is $1,700 to $3,500 on its own.\n\n" +
            "Two ways to cut it. First, <strong>only replace what has failed</strong> — saw at the control joints and pour new sections, keeping the sound concrete. Second, <strong>overlay</strong>: a 3 to 4 inch bonded concrete surface over an existing sound slab costs roughly 60% of a full replacement, and a 1.5 inch stamped overlay on top of that is less again.\n\n" +
            "An overlay is only viable if the existing slab is sound, level and free of active cracks. If it is heaving or cracking through, it has to come out."
      },
      {
        id: "driveway-curing",
        q: "How long after pouring a driveway can I drive on it?",
        a: "<strong>Wait 7 days</strong> before driving on a new concrete driveway, and <strong>24 to 48 hours</strong> before walking on it.\n\n" +
            "Concrete reaches most of its strength by 28 days, but it gains enough strength to carry a passenger car at around 7 days. A full pickup or an RV loaded with several thousand pounds should wait the full <strong>28 days</strong>.\n\n" +
            "The fastest way to damage a new driveway is to park on it early. Concrete cures by hydrating — it is gaining strength from moisture, not drying. Loading it before it has bonded means tire marks that can be permanent, and in cold weather an early load can cause a structural crack.\n\n" +
            "During the cure, keep the curing compound on and, if you used one, leave the plastic sheeting down. Do not seal or apply any other product to the surface for at least <strong>28 days</strong> — sealers applied early can trap moisture and cause surface scaling."
      },
      {
        id: "driveway-joints",
        q: "Where do control joints go in a concrete driveway?",
        a: "Control joints divide a slab into panels small enough that any cracking happens <em>at the joint</em>, where it is filled and sealed, instead of randomly across the surface.\n\n" +
            "The rule is simple: <strong>space them no more than 10 feet apart</strong> for a 4 inch slab, and no more than <strong>12 feet</strong> for a 5 to 6 inch driveway. Divide the length by 10 and you have your panel count.\n\n" +
            "A 24-foot driveway wants <strong>three sections</strong>, jointed at about 8 feet. Joints run <strong>across</strong> the driveway, not down the middle — a longitudinal joint in the center of a drive is not needed and adds an extra line to seal.\n\n" +
            "Two ways to form a joint. <strong>Saw cutting</strong> is the common method: cut within <strong>1 to 4 hours</strong> of finishing, to a depth of one quarter of the slab thickness. <strong>Grooving</strong> with a hand tool during finishing is faster but only works on a straight edge. Either way, fill the joint with a flexible sealer — it is the joint that fails, not the concrete."
      },
      {
        id: "driveway-seal",
        q: "Do I need to seal a concrete driveway?",
        a: "Not immediately, and not strictly at all. Sealing is optional on a properly placed, well-jointed driveway. What is not optional is <strong>keeping the joints sealed</strong> — that is what stops water reaching the rebar and the base.\n\n" +
            "If you do seal, wait <strong>28 days</strong> after the pour. Apply a penetrating sealer rather than an acrylic film: penetrating sealers soak into the surface and leave the natural texture, while acrylics sit on top and can peel or yellow.\n\n" +
            "The best timing depends on your climate. In a freeze-thaw region, seal before the first freeze. In a hot, dry region, sealing the first year actually helps — concrete that has not fully cured loses moisture faster than it can replace it, and a sealer slows that down.\n\n" +
            "Plan to renew every <strong>3 to 5 years</strong>. And apply it to <strong>both the slab and the joints</strong> — a sealed slab with an unsealed joint still lets water in at the worst possible place."
      }
    ],
    "patio-cost": [
      {
        id: "patio-cost",
        q: "How much does a concrete patio cost?",
        a: "A concrete patio costs <strong>$6 to $10 per square foot</strong> installed in 2026, and most projects land between $7 and $9.\n\n" +
            "Typical totals:\n\n" +
            "<ul><li>10 x 10 patio (100 sq ft): $600–$1,000</li><li>12 x 12 patio (144 sq ft): $864–$1,440</li><li>16 x 20 patio (320 sq ft): $1,900–$3,200</li><li>20 x 20 patio (400 sq ft): $2,400–$4,400</li></ul>\n\n" +
            "A patio is the cheapest of the flatwork pours because it is thin (4 inches), light on reinforcement, and easy to access. Decorative finishes change the number: stamped patios run $10–$22 per sq ft, and exposed aggregate runs $8–$15.\n\n" +
            "The spread above reflects scope, not just size. A quote that excludes delivery, control joints, curing compound, and site prep lands near the bottom; a complete project lands near the top."
      },
      {
        id: "patio-size",
        q: "How much does a 20x20 concrete patio cost?",
        a: "A 20 x 20 ft patio covers 400 square feet. Installed, expect <strong>$2,400 to $4,400</strong> for a standard 4-inch broom-finish slab, with most fully-scoped projects landing near $3,200–$4,400.\n\n" +
            "Where the money goes on a 400 sq ft patio:\n\n" +
            "<ul><li>Ready-mix concrete (4.94 yd³ + 10% waste): $845–$930</li><li>Delivery plus short-load fee: $180–$320</li><li>4 in compacted gravel base: $300–$760</li><li>Forms: $180–$360</li><li>Welded wire mesh: $80–$360</li><li>Placing and finishing labor: $1,200–$3,200</li><li>Control joints and curing compound: $180–$460</li></ul>\n\n" +
            "That is about $8 per square foot all-in. If your quote comes in materially higher, check whether the estimate assumed 4 inches or 6 inches, and whether a decorative finish or a pump is included."
      },
      {
        id: "patio-thickness",
        q: "How thick should a concrete patio be?",
        a: "Four inches is the standard, and it handles everything a residential patio throws at it — people, furniture, a grill, and a hot tub on a thickened section.\n\n" +
            "The IRC does not actually regulate exterior patios, though the ACI 330R-08 guidance is worth quoting: <em>\"As a practical matter, there is no benefit in building slabs less than 4 in. (100 mm) thick.\"</em>\n\n" +
            "For a patio, use <strong>3,000–3,500 PSI concrete</strong> on <strong>4 inches of compacted gravel</strong>, with welded wire mesh or fiber reinforcement. That combination is the industry standard for a patio slab.\n\n" +
            "Two exceptions where you should go thicker:\n\n" +
            "<ul><li><strong>Hot tubs or outdoor kitchens</strong> — thicken to 6 inches under the concentrated load area with #4 rebar at 12 in on center.</li><li><strong>Freeze-thaw climates</strong> — stay at 4 inches but specify 4,000 PSI with 5–7% air entrainment. Air entrainment matters more than thickness here.</li></ul>\n\n" +
            "Thickening a patio is cheap. Retrofitting a 4-inch slab to 6 inches after it has cracked is not."
      },
      {
        id: "patio-cost-per-sqft",
        q: "How much does a concrete patio cost per square foot?",
        a: "A concrete patio runs <strong>$7 to $12 per square foot</strong> installed in 2026.\n\n" +
            "<ul>\n<li><strong>12 x 12 ft</strong> (144 sq ft) — $1,000 to $1,700</li>\n<li><strong>16 x 16 ft</strong> (256 sq ft) — $1,800 to $3,100</li>\n<li><strong>16 x 20 ft</strong> (320 sq ft) — $2,200 to $3,800</li>\n<li><strong>20 x 20 ft</strong> (400 sq ft) — $2,800 to $4,800</li>\n</ul>\n\n" +
            "A standard patio is <strong>4 inches</strong> thick on a 4-inch compacted base with welded wire mesh, and it carries no vehicle load — which is why it sits below a driveway on the same square foot.\n\n" +
            "A stamped or colored surface adds <strong>$5 to $12 per square foot</strong>. The concrete costs the same; the extra is labor for the pattern and the sealer."
      },
      {
        id: "patio-rebar",
        q: "Do I need rebar in a concrete patio?",
        a: "Usually <strong>welded wire mesh</strong> rather than rebar — and sometimes neither.\n\n" +
            "For a 4 inch patio on well-compacted, stable ground with furniture and foot traffic, most builders use 6 x 6 inch welded wire mesh. It costs a fraction of rebar, it does not rust the way rebar can at the surface, and it holds the slab together against shrinkage cracking.\n\n" +
            "Use <strong>#3 rebar at 24 inches on center</strong> instead where the patio spans, sits over fill, or abuts the house and needs to stay level with the door threshold.\n\n" +
            "Two things matter more than the material choice. The mesh or rebar must sit in the <strong>bottom third of the slab</strong>, and it must have at least <strong>2 inches of cover</strong> from the edge. Mesh laid directly on the base will rust through in a few wet winters.\n\n" +
            "Mesh is supplied in 5 x 7 ft sheets, so a 20 x 20 ft patio needs about <strong>12 sheets</strong> with the laps lapped one full mesh spacing."
      },
      {
        id: "patio-shapes",
        q: "How much does an irregular-shaped concrete patio cost?",
        a: "Shape affects cost mostly through <strong>formwork</strong>, not through the concrete itself. Concrete is priced by volume, so a curved patio uses the same concrete per square foot as a square one. The difference is the labor to set and hold curved forms and to finish the edges.\n\n" +
            "A straight-edged 16 x 20 ft patio at 4 inches is 320 sq ft and about <strong>2.4 cubic yards</strong>. A curved patio of the same area needs roughly <strong>10 to 20% more labor</strong> because the forms are built from flexible or cut sections rather than straight boards, and the edges are harder to screed.\n\n" +
            "Expect a curved or freeform patio to land at <strong>$9 to $15 per square foot</strong> rather than $7 to $12.\n\n" +
            "Calculate the volume by breaking the shape into rectangles and triangles and adding the areas — for example, a rectangle 20 x 12 ft plus a triangle with a 20 ft base and 6 ft height gives 240 + 60 = <strong>300 sq ft</strong>. The calculator's <strong>Triangle</strong> and <strong>Custom</strong> modes do this directly."
      },
      {
        id: "patio-joints",
        q: "Where do control joints go in a concrete patio?",
        a: "Space them so no panel is wider than <strong>10 feet</strong> in any direction for a 4 inch slab. Most patios work out to one joint down the middle and one across, dividing the slab into four roughly square panels.\n\n" +
            "A 20 x 20 ft patio wants joints at the 10 foot marks in both directions — four panels. A 12 x 16 ft patio wants one joint across the long side at 8 feet and one down the middle of the remaining panel.\n\n" +
            "For a patio with an L-shape or a curve, run the joints so they continue from the edge of the slab, and keep the panels as close to square as you can. Long, narrow panels crack more readily than square ones.\n\n" +
            "Cut the joints within <strong>1 to 4 hours</strong> of finishing, to a depth of <strong>1 inch</strong> — one quarter of a 4 inch slab. Seal every joint with a flexible polyurethane or polysulfide sealer, and keep it maintained. A failed joint is where water gets in, and water gets in is how a patio ends up with a chunk missing two winters later."
      },
      {
        id: "patio-curing",
        q: "How long does a concrete patio take to cure?",
        a: "<strong>24 to 48 hours</strong> before walking, <strong>7 days</strong> before setting furniture on it, and <strong>28 days</strong> before sealing or heavy loading.\n\n" +
            "Concrete gains roughly 50% of its final strength in the first 3 days and reaches design strength at 28 days. The practical difference between a patio and a driveway is that a patio carries furniture and foot traffic, not vehicles — so 7 days is usually enough for normal use.\n\n" +
            "Keep the curing compound on for the full period, and do not let the surface dry out. Concrete cures by hydrating, not by drying. If it loses moisture too fast in the first days, the surface will crust and dust.\n\n" +
            "Two avoidable mistakes: moving furniture back within the first 48 hours, which leaves marks, and applying a sealer before 28 days, which can trap moisture and cause surface scaling."
      },
      {
        id: "patio-stamped",
        q: "How much more does a stamped concrete patio cost?",
        a: "Stamping adds <strong>$5 to $12 per square foot</strong> over standard broom finish. A 320 sq ft patio moves from roughly $2,200 to <strong>$3,800–$6,600</strong> depending on the pattern.\n\n" +
            "The cost is almost entirely labor. The concrete itself is the same 3,500 PSI mix, and the coloring is either an integral pigment broadcast into the surface or a chemical stain applied after the pour. The real cost is the crew working the mat into the soft concrete — every square foot has to be stamped before it hardens enough to reject the impression.\n\n" +
            "Two things drive the price up. <strong>Complex patterns</strong> with multiple textures and grout lines take far longer than a simple ashlar slate. <strong>Colored, sealed concrete</strong> adds a layer of work and a second material.\n\n" +
            "For comparison, stamped concrete runs well below pavers on installed cost, has no joints between units, and cannot shift or settle individually. Against pavers, the trade is a less forgiving repair story if the slab ever moves."
      },
      {
        id: "patio-diy",
        q: "Can I pour a concrete patio myself?",
        a: "Yes — a 10 x 10 patio at 4 inches is 1.23 cubic yards, which is one of the most realistic DIY pours there is. The labor is the hard part, not the arithmetic.\n\n" +
            "The realistic DIY sequence: excavate and compact a 4-inch base, lay the vapor barrier, set forms and mesh, order the concrete, pour and screed, float and finish, cut the joints, and cure. That is a full weekend for two people, and the screeding step is where inexperienced hands go wrong.\n\n" +
            "Three things to decide before starting. <strong>Do you have a way to move 4,050 lb of concrete?</strong> With ready-mix, that is a truck backing up to the forms. With bags, it is 62 trips in a wheelbarrow. <strong>Can you finish it in the working time?</strong> A 1.23 cubic yard pour is manageable; a 4 cubic yard pour is not a one-day beginner project.\n\n" +
            "And <strong>do you know where the control joints go</strong> before you start, not after. Once the concrete is down, the joints are where you put them."
      },
      {
        id: "patio-vapor-barrier",
        q: "Do I need a vapor barrier under a concrete patio?",
        a: "Yes — <strong>6 mil poly or a 10 mil vapor retarder</strong> goes under the slab, on top of the compacted base and under the reinforcement.\n\n" +
            "Its job is to stop moisture from the soil wicking up through the slab. That matters for three reasons: it stops damp rising into the finished surface and causing efflorescence, it keeps moisture away from the mesh or rebar so it does not corrode, and it stops the ground from pulling water out of the concrete during the cure.\n\n" +
            "A vapor retarder is not the same as waterproofing. It is a <strong>slowly-permeable</strong> sheet, designed to let the ground dry downward while stopping upward moisture movement. That is the correct choice for a slab-on-grade. A true waterproof membrane for a crawlspace or basement is a different product with a different installation.\n\n" +
            "Lay it flat with no wrinkles or tears, lap the seams generously, and seal the edges with tape or sealant. A 2-inch lap and a bead of sealant along the perimeter is standard practice.\n\n" +
            "Do not skip it. It is one of the cheapest items in the job and one of the hardest to retrofit."
      },
      {
        id: "patio-20x20",
        q: "How much does a 20 x 20 concrete patio cost?",
        a: "A 20 x 20 ft patio at 4 inches with a 4-inch base and welded wire mesh costs <strong>$2,800 to $4,800</strong> installed in 2026 — about <strong>$10.45 per square foot</strong> at the typical rate.\n\n" +
            "Material breakdown: 400 sq ft at 4 inches is <strong>4.94 cubic yards</strong>, which is <strong>245 bags of 80 lb mix</strong> or one ready-mix load of 5.43 yards with waste. Ready-mix runs about <strong>$842</strong> plus <strong>$120</strong> delivery.\n\n" +
            "Everything else on the bill: site prep <strong>$340</strong>, gravel base <strong>$500</strong>, forms <strong>$180</strong>, mesh <strong>$180</strong>, vapor barrier <strong>$80</strong>, labor <strong>$1,800</strong>, control joints <strong>$175</strong> and curing compound <strong>$200</strong>.\n\n" +
            "A 20 x 20 patio needs <strong>four control joints</strong> — one across the middle in each direction — so no panel is wider than 10 feet."
      }
    ],
    "rebar-calculator": [
      {
        id: "rebar-how",
        q: "How much rebar does a concrete slab need?",
        a: "Calculate rebar as linear feet in each direction, based on the spacing, then add the overlaps and the extra length each bar needs to tie into the forms.\n\n" +
            "<span class=\"formula\">Bars in one direction = ceil(slab length ÷ spacing) + 1<br>Linear feet = bars x slab width (or length)</span>\n\n" +
            "For a 20 x 20 ft slab with #3 rebar at 18 inches on center:\n\n" +
            "<ul><li>Bars running one way: ceil(20 ÷ 1.5) + 1 = 15 bars</li><li>Each bar spans the 20 ft width, plus 6 inches of embedment on each side = 21 ft</li><li>15 x 21 = 315 linear feet</li><li>Both directions: <strong>630 linear feet</strong></li></ul>\n\n" +
            "On a 20 x 20 slab, #3 rebar at 18 in on center runs about $220–$440 installed, or $1.10 per square foot at the typical rate. #4 rebar at 12 in on center roughly doubles that."
      },
      {
        id: "rebar-spacing",
        q: "What spacing do I use for rebar in a residential slab?",
        a: "Spacing follows the load:\n\n" +
            "<ul><li><strong>Wire mesh (6x6 W1.4)</strong> — patios, walkways, shed pads. Light duty.</li><li><strong>#3 rebar at 18 in on center</strong> — residential driveways and garage floors carrying passenger cars and half-ton pickups. The standard residential spec.</li><li><strong>#4 rebar at 12 in on center</strong> — heavy vehicle driveways, RV and boat pads, and structural slabs.</li><li><strong>#4 rebar at 12–18 in on center</strong> — commercial and warehouse slabs.</li></ul>\n\n" +
            "ACI 332 calls for reinforcement in residential slabs that support vehicles. It is not required by the IRC for a residential slab, but rebar at 18 in on center adds $0.50–$1.00 per square foot and dramatically reduces cracking from thermal expansion and soil movement.\n\n" +
            "Bar size matters less than placement. <strong>Support the rebar at mid-depth</strong> — roughly 2 inches off the bottom in a 4-inch slab — using wire chairs or concrete blocks. Rebar lying flat on the sub-base is decorative, not structural."
      },
      {
        id: "rebar-vs-mesh",
        q: "Should I use rebar or welded wire mesh?",
        a: "Rebar is stronger and better for anything carrying a vehicle. Mesh is cheaper and adequate for pedestrian loads.\n\n" +
            "<ul><li><strong>Welded wire mesh:</strong> $0.20–$0.90 per sq ft. Good for patios, sidewalks, and shed pads. It resists shrinkage cracking well.</li><li><strong>#3 rebar at 18 in o.c.:</strong> $0.70–$1.40 per sq ft. The right choice for driveways and garage floors.</li><li><strong>#4 rebar at 12 in o.c.:</strong> $1.00–$2.00 per sq ft. Heavy loads and structural work.</li><li><strong>Both:</strong> roughly $1.50 per sq ft. Used where a slab is truly structural.</li></ul>\n\n" +
            "A practical point: mesh is hard to position accurately. It is flexible, and if it is not lifted on chairs and tied in the right grid, it ends up bunched at one edge. Rebar is stiffer, holds its position better, and is far easier to inspect before the pour — you can walk the grid and see the spacing.\n\n" +
            "Fiber mesh added to the mix is a third option at $0.10–$0.32 per sq ft. It controls shrinkage cracking but does not replace steel for structural capacity."
      },
      {
        id: "rebar",
        q: "Do I need rebar in a concrete slab?",
        a: "Reinforcement is not required by the IRC for a residential slab, but it is strongly recommended and it is what separates a slab that lasts 30 years from one that cracks in three.\n\n" +
            "<ul><li><strong>Fiber mesh</strong> — $0.10–$0.32 per sq ft. Controls shrinkage cracking in the mix. Not a structural substitute for steel.</li><li><strong>Welded wire mesh (6x6 W1.4)</strong> — $0.20–$0.90 per sq ft. Fine for patios, walks, and shed pads.</li><li><strong>#3 rebar at 18 in on center</strong> — $0.70–$1.40 per sq ft. The standard residential spec for driveways and garage floors.</li><li><strong>#4 rebar at 12 in on center</strong> — $1.00–$2.00 per sq ft. For heavy vehicle loads and structural slabs.</li></ul>\n\n" +
            "One detail that matters more than the steel itself: <strong>support the rebar at mid-depth</strong>, roughly 2 inches off the bottom of a 4-inch slab, using wire chairs or concrete blocks. Rebar resting flat on the sub-base adds almost no value — it needs to sit inside the concrete matrix, in the upper third, where the tension actually develops.\n\n" +
            "A 4-inch slab on a consistent, well-compacted base will outperform a 6-inch slab over soft spots, because the soft spot is exactly where the slab has to span and bend."
      },
      {
        id: "rebar-amount",
        q: "How much rebar do I need for a concrete slab?",
        a: "Total linear feet = the area of the slab divided by the spacing, in both directions, then added together.\n\n" +
            "<span class=\"formula\">One direction = (length ÷ spacing) × width<br>Both directions = (length ÷ spacing) × width + (width ÷ spacing) × length</span>\n\n" +
            "For a 20 x 20 ft slab with #4 rebar at 18 inches on center, both ways:\n\n" +
            "<ul>\n<li>Across: 20 ft ÷ 1.5 ft = 14 bars × 20 ft = <strong>280 linear ft</strong></li>\n<li>Both ways: 280 + 280 = <strong>662 linear ft</strong>, or <strong>30 bars</strong> of 20 ft stock</li>\n</ul>\n\n" +
            "One direction only — which is adequate for many patios and pads on stable ground — comes to <strong>331 linear feet</strong>, about 17 bars.\n\n" +
            "Rebar is sold in 20 ft sticks, so 662 linear feet is 34 sticks with the lap splices; 30 bars is the number of pieces after you cut and lap them. The rebar calculator on this page does the arithmetic for any size and spacing."
      },
      {
        id: "rebar-sizes",
        q: "What is the difference between #3, #4, #5 and #6 rebar?",
        a: "The number is the bar's diameter in eighths of an inch.\n\n" +
            "<ul>\n<li><strong>#3</strong> — 3/8 in diameter, 0.11 sq in area — light residential work, patios, shed pads</li>\n<li><strong>#4</strong> — 1/2 in diameter, 0.20 sq in area — the standard for residential driveways and garage floors</li>\n<li><strong>#5</strong> — 5/8 in diameter, 0.31 sq in area — heavy loads, 6 inch slabs, RV pads</li>\n<li><strong>#6</strong> — 3/4 in diameter, 0.44 sq in area — commercial and post-tensioned work</li>\n</ul>\n\n" +
            "Bigger is not automatically better. What matters is the <strong>amount of steel</strong> in a given area, which is what spacing controls. A #4 at 18 inches on center provides about <strong>0.0011 sq in of steel per sq in of slab</strong>; a #3 at 12 inches provides nearly the same.\n\n" +
            "The practical reason to step up a size rather than tighten the spacing is <strong>handling</strong>. #3 is light enough to cut and tie by hand comfortably. #5 and #6 are noticeably heavier and need a real bender and cutter.\n\n" +
            "Use #4 unless your engineer, your local code, or the load tells you otherwise."
      },
      {
        id: "rebar-4inch",
        q: "What rebar spacing do I need for a 4 inch concrete slab?",
        a: "For a 4 inch residential slab, the standard is <strong>#3 rebar at 24 inches on center</strong> for light loads, or <strong>#4 rebar at 18 inches on center</strong> for a slab that carries vehicles or spans a gap.\n\n" +
            "A typical 4 inch garage floor or driveway section uses #4 at 18 inches both ways. A 4 inch patio or shed pad on stable ground uses #3 at 24 inches, or 6 x 6 welded wire mesh.\n\n" +
            "The 18 inch spacing for #4 is not arbitrary — it is the detail that produces about <strong>0.0011 sq in of steel per sq in of slab</strong>, which is the ratio most residential slab designs settle on.\n\n" +
            "The spacing must land so the bars are evenly distributed and clear of the edges. In a <strong>4 inch slab the bar sits roughly 1 inch above the base</strong>, with at least 1.5 inches of cover from any edge.\n\n" +
            "One caution: <strong>spacing is measured center to center</strong>, and a common error is to start the first bar at the edge and then space from there, which pushes the last bar off the slab or leaves a gap at the far end. Lay the bars out from the centre outward instead."
      },
      {
        id: "rebar-6inch",
        q: "What rebar spacing do I need for a 6 inch concrete slab?",
        a: "For a 6 inch slab, use <strong>#4 rebar at 12 inches on center</strong> as the baseline, and step up to <strong>#5 at 12 inches</strong> for heavy vehicle loads, RV pads and anything over fill.\n\n" +
            "A 6 inch slab is a different structure from a 4 inch one. It is typically post-tensioned, pre-stressed, or heavily reinforced with a structural engineer's design, and the reinforcement is part of a load path rather than crack control alone.\n\n" +
            "For a <strong>post-tensioned</strong> slab, the tendons are placed in sheathed ducts at a specific depth and tensioned after the concrete reaches about 75% of its design strength. That is not a DIY detail — it needs an engineer and a specialist crew.\n\n" +
            "For a <strong>conventionally reinforced</strong> 6 inch slab, #4 at 12 inches both ways gives roughly the same steel ratio as #4 at 18 inches in a 4 inch slab.\n\n" +
            "Whichever route you take, <strong>get the design confirmed by an engineer</strong> before pouring a 6 inch slab. The cost of doing it right is a small fraction of the cost of a slab that fails."
      },
      {
        id: "rebar-overlap",
        q: "How much rebar overlap do I need?",
        a: "Lap each bar over the next by <strong>40 times the bar diameter</strong>.\n\n" +
            "<ul>\n<li><strong>#3</strong> — 12 in overlap</li>\n<li><strong>#4</strong> — 16 in overlap</li>\n<li><strong>#5</strong> — 20 in overlap</li>\n<li><strong>#6</strong> — 24 in overlap</li>\n</ul>\n\n" +
            "This is the ACI detail for Class B splices in a lapped splice, and it is what allows two pieces of bar to act as one continuous length of steel. The overlap is measured <strong>from the end of one bar to the far end of the bar it crosses</strong>, so add the bar diameter to the splice length when you cut.\n\n" +
            "Tie the bars at the overlap with wire ties, two per overlap — one near each end. A loose lap will shift while the concrete is being placed and the whole grid moves.\n\n" +
            "For the standard 20 ft stock, a 16 in overlap on #4 means each bar covers about 18.3 ft of the run, so a 20 ft slab needs 2 bars per line with a small splice, or 3 if you want the lap centred."
      },
      {
        id: "rebar-cover",
        q: "How far should rebar be from the edge of a concrete slab?",
        a: "Rebar should sit at least <strong>1.5 inches</strong> from the edge in residential slabs, and <strong>2 inches</strong> is the better target where the slab is exposed or the climate is freeze-thaw.\n\n" +
            "This distance is called <strong>cover</strong>, and it does two jobs. It keeps the steel from corroding — the outer inch of a slab is the part that gets wet first and dries last, and rusting steel expands and spalls the concrete off the surface. It also protects the bar during placement, where a kicked or walked-on bar ends up too close.\n\n" +
            "In a <strong>4 inch slab</strong>, the rebar sits about <strong>1 inch above the base</strong>, which puts it in the bottom third of the slab — the tension zone, where flexing cracks open. Bars placed at mid-depth are markedly less effective.\n\n" +
            "Use <strong>plastic rebar chairs or bolsters</strong> rather than setting the grid on rocks or on the base itself. Chairs hold the bar at a consistent height and keep it from shifting while the concrete is placed. Rocks are the traditional method and they work, but they are hard to check."
      },
      {
        id: "rebar-cost",
        q: "How much does rebar cost for a concrete slab?",
        a: "Reinforcement runs about <strong>$0.70 to $2.00 per square foot</strong> of slab installed, and for a 20 x 20 ft slab that is roughly <strong>$280 to $1,600</strong>.\n\n" +
            "Material rates in 2026 put #4 rebar around <strong>$0.85 to $1.30 per linear foot</strong>. On the reference 20 x 20 slab with #4 at 18 inches both ways, you need <strong>662 linear feet</strong>, which is about <strong>$560 to $860</strong> of steel before the tie wire and chairs.\n\n" +
            "The wide range is mostly about the price of steel, which moves, and about how much labor the job takes. Hand-tying a grid for a small slab is quick; a large grid is a lot of tying.\n\n" +
            "Welded wire mesh is the budget option at roughly <strong>$0.30 to $0.60 per square foot</strong> and is the right call for patios and shed pads. It is supplied in 5 x 7 ft sheets, so a 400 sq ft slab needs about <strong>12 sheets</strong> with a one-mesh lap.\n\n" +
            "The rebar calculator on this page returns both the linear footage and the estimated material cost."
      },
      {
        id: "rebar-drill",
        q: "Should rebar be drilled into the existing slab or overlapped?",
        a: "When you are <strong>adding new concrete next to an existing slab</strong> — a patio extension, an addition to a driveway — drill into the old slab and tie the new rebar into it. When you are <strong>pouring a new slab that replaces the old one</strong>, lap the new bars; there is nothing to tie into.\n\n" +
            "For a drilled tie: drill <strong>3/4 inch holes</strong> about <strong>6 inches deep</strong>, spaced 18 to 24 inches apart along a line at the location of the new rebar, clean each hole with a brush and compressed air, and grout it with a non-shrink structural grout. Set the bar into the grouted hole and let it cure before pouring.\n\n" +
            "Do not simply drill a hole and drive the rebar into it. That gives a bar with no mechanical bond and no corrosion protection, and it will not tie the two slabs together.\n\n" +
            "If the existing slab is sound, you can also <strong>drill and dowel</strong> the new rebar to the edge of the old slab for the same effect. If the old slab is cracked or settled, the better answer is to remove it and start over."
      },
      {
        id: "rebar-placement",
        q: "Where do I put the rebar in a concrete slab?",
        a: "The rebar goes in the <strong>bottom third of the slab</strong>, on chairs, above the vapor barrier and above the compacted base.\n\n" +
            "The sequence from the ground up is:\n\n" +
            "<ul>\n<li>Compacted gravel base</li>\n<li>Vapor barrier or vapor retarder</li>\n<li>Rebar grid, on chairs, at the bottom third</li>\n<li>Concrete</li>\n</ul>\n\n" +
            "In a 4 inch slab the bar sits about <strong>1 inch above the base</strong>. In a 6 inch slab, roughly 2 inches. The grid is wired together at every crossing with tie wire — a single zip tie or a short piece of annealed wire both work, and the intersections are what hold the grid in a flat plane while the concrete is placed.\n\n" +
            "Three common mistakes. Setting the grid directly on the base with no chairs, so it ends up too low. Pouring the concrete before the grid is fully tied, so it moves under the weight. And walking on the grid during the pour — you will push it down and it will not come back up on its own.\n\n" +
            "Pour in <strong>layers</strong>, keeping the concrete ahead of the grid and never dumping concrete directly onto the bars."
      }
    ]
  };

  /* ======================================================================
     RENDERING
     ====================================================================== */
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Answers contain a small, deliberate set of trusted HTML tags.
  function renderAnswer(a) {
    return "<p>" + a + "</p>";
  }

  function faqFor(pageKey) {
    // The FAQ hub shows every question from every page, deduplicated by id.
    if (pageKey === "faq") {
      var lists = [CORE];
      for (var key in PAGE_FAQ) {
        if (Object.prototype.hasOwnProperty.call(PAGE_FAQ, key)) lists.push(PAGE_FAQ[key]);
      }
      var merged = [], seen = {};
      for (var i = 0; i < lists.length; i++) {
        for (var j = 0; j < lists[i].length; j++) {
          var item = lists[i][j];
          if (seen[item.id]) continue;
          seen[item.id] = true;
          merged.push(item);
        }
      }
      return merged;
    }
    return CORE.concat(PAGE_FAQ[pageKey] || []);
  }

  function renderFaq(pageKey, mount) {
    var items = faqFor(pageKey);
    if (!mount) return items;
    var html = items.map(function (it) {
      return '<details class="faq-item"' + (it.open ? ' open' : '') + ' id="faq-' + it.id + '">' +
        '<summary class="faq-q">' + escapeHtml(it.q) + '</summary>' +
        '<div class="faq-a">' + renderAnswer(it.a) + '</div>' +
      '</details>';
    }).join("\n");
    mount.innerHTML = html;
    return items;
  }

  /* ---------- FAQPage structured data ---------- */
  function buildFaqSchema(pageKey, siteUrl) {
    var items = faqFor(pageKey).map(function (it) {
      return {
        "@type": "Question",
        name: it.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: stripTags(renderAnswer(it.a))
        }
      };
    });
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items
    };
  }

  function stripTags(html) {
    return String(html)
      .replace(/<\/(p|ul|ol|li|span)>/g, "\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  global.PourCostFaq = {
    CORE: CORE,
    PAGE_FAQ: PAGE_FAQ,
    faqFor: faqFor,
    renderFaq: renderFaq,
    buildFaqSchema: buildFaqSchema,
    stripTags: stripTags
  };
})(typeof window !== "undefined" ? window : this);
