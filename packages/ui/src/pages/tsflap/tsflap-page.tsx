import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import type { FunctionComponent } from "react";
import { useNavigate } from "react-router";

import { LinkableSection } from "@/components/linkable-section";
import { Markdown } from "@/components/markdown";
import { PageSectionBackground } from "@/components/page-section-background";
import { PageSectionContent } from "@/components/page-section-content";
import { ROUTE_PATHS } from "@/routes";

const DOCUMENTATION_ID = "documentation";

interface DocSectionProps {
  readonly title: string;
  readonly content: string;
  readonly index: number;
}

/* ═══════════════════════════════════════════════════════════════════
   Documentation Content — Thesis-grade coverage of formal language
   theory, automata, the Chomsky hierarchy, and the TSFlap simulator.
   ═══════════════════════════════════════════════════════════════════ */

const docSections: Omit<DocSectionProps, "index">[] = [
  {
    title: "I. Formal Languages — The Mathematical Foundation",
    content: `At the heart of theoretical computer science lies a deceptively simple question: **what can be computed, and how efficiently?** The theory of formal languages provides the mathematical framework for answering this question.

A **formal language** is a set of strings over some finite alphabet. More precisely, given an alphabet **Σ** (a finite, non-empty set of symbols), a language **L** is any subset of **Σ\\***, where **Σ\\*** denotes the set of all finite strings (including the empty string **ε**) that can be formed from symbols in **Σ**.

For example, if **Σ = {0, 1}**, then:
- **L₁ = {0, 01, 011, 0111, ...}** — strings starting with 0 followed by any number of 1s
- **L₂ = {ε, 01, 0011, 000111, ...}** — strings of the form **0ⁿ1ⁿ** for n ≥ 0
- **L₃ = {w ∈ Σ\\* | w is a valid C program}** — the set of all syntactically valid C programs

These three languages differ profoundly in their computational complexity. L₁ can be recognized by the simplest possible machine (a finite automaton). L₂ requires a machine with a stack (a pushdown automaton). L₃ requires the full power of a Turing Machine. This stratification is formalized by the **Chomsky Hierarchy**, which we will explore in depth.

The study of formal languages was pioneered by **Noam Chomsky** (1956) in the context of natural language syntax, and independently by engineers working on compiler design in the late 1950s. The resulting theory has become one of the most elegant and practically important branches of computer science, underpinning compilers, regular expressions, protocol verification, hardware design, and artificial intelligence.

> *"The theory of automata and formal languages is one of the most beautiful and practically relevant areas of theoretical computer science."*
> — Hopcroft, Motwani & Ullman, *Introduction to Automata Theory, Languages, and Computation* (2006)`,
  },
  {
    title: "II. Strings, Alphabets & Operations",
    content: `Before we can define machines that process languages, we need precise definitions of the objects they operate on.

**Alphabet (Σ)** — A finite, non-empty set of symbols. Examples: \`{0, 1}\`, \`{a, b, c}\`, \`{(, )}\`.

**String (word)** — A finite sequence of symbols from an alphabet. The string \`abba\` over \`{a, b}\` has length 4. The **empty string** is denoted **ε** and has length 0.

**Σ\\*** (Kleene star) — The set of all finite strings over Σ, including ε. If Σ = {a, b}, then Σ\\* = {ε, a, b, aa, ab, ba, bb, aaa, ...}. This is always a countably infinite set.

**Σ⁺** — The set Σ\\* minus ε. All non-empty strings.

**Language** — Any subset L ⊆ Σ\\*. A language can be finite (e.g., {cat, dog}) or infinite (e.g., all binary palindromes). The empty language ∅ and the language {ε} are both valid languages (and they are different — ∅ contains no strings, while {ε} contains exactly one string: the empty string).

**Key operations on languages:**
- **Union**: L₁ ∪ L₂ = {w | w ∈ L₁ or w ∈ L₂}
- **Concatenation**: L₁ · L₂ = {xy | x ∈ L₁ and y ∈ L₂}
- **Kleene Star**: L\\* = {ε} ∪ L ∪ L·L ∪ L·L·L ∪ ... (zero or more concatenations)
- **Complement**: L̄ = Σ\\* \\\\ L (all strings NOT in L)
- **Intersection**: L₁ ∩ L₂ = {w | w ∈ L₁ and w ∈ L₂}

These operations are central to the **closure properties** of language classes — whether applying an operation to languages in a class always produces a language still in that class. Regular languages, for instance, are closed under all five operations above. Context-free languages are closed under union, concatenation, and Kleene star, but **not** under complement or intersection.`,
  },
  {
    title: "III. Deterministic Finite Automata (DFA)",
    content: `A **Deterministic Finite Automaton (DFA)** is the simplest computational model that can recognize patterns in strings. Despite its simplicity, it is remarkably powerful within its domain.

**Formal Definition.** A DFA is a 5-tuple **M = (Q, Σ, δ, q₀, F)** where:
- **Q** — a finite set of states
- **Σ** — a finite input alphabet
- **δ: Q × Σ → Q** — the transition function (total: defined for every state-symbol pair)
- **q₀ ∈ Q** — the initial (start) state
- **F ⊆ Q** — the set of accepting (final) states

**Computation.** Given an input string w = a₁a₂...aₙ, the DFA starts in state q₀ and processes symbols left to right. After reading aᵢ in state qᵢ₋₁, it transitions to qᵢ = δ(qᵢ₋₁, aᵢ). The string is **accepted** if qₙ ∈ F; otherwise it is **rejected**.

**Key properties:**
- **Determinism** — for every state and symbol, there is exactly one next state. No ambiguity, no choice.
- **Totality** — δ is a total function. Every state must have a transition for every symbol (missing transitions implicitly go to a "dead state").
- **Finite memory** — the machine's entire memory is its current state. It cannot count beyond a fixed bound.

**What DFAs can recognize:**
- Strings ending in a specific pattern (e.g., ends with "01")
- Strings with an even/odd number of a particular symbol
- Strings matching a regular expression
- Valid identifiers, keywords, and tokens in programming languages

**What DFAs cannot recognize:**
- Balanced parentheses — requires unbounded counting
- Palindromes — requires remembering the entire first half
- \`aⁿbⁿ\` — requires counting to an arbitrary n

The class of languages recognized by DFAs is exactly the **regular languages** (Chomsky Type 3).

> *Reference: Rabin, M. O. & Scott, D. (1959). "Finite Automata and Their Decision Problems." IBM Journal of Research and Development, 3(2), 114–125. (Turing Award, 1976)*`,
  },
  {
    title: "IV. Non-deterministic Finite Automata (NFA)",
    content: `A **Non-deterministic Finite Automaton (NFA)** generalizes the DFA by allowing multiple possible transitions from a single state on a single symbol, and by permitting transitions on the empty string ε.

**Formal Definition.** An NFA is a 5-tuple **M = (Q, Σ, δ, q₀, F)** where:
- **Q, Σ, q₀, F** — same as DFA
- **δ: Q × (Σ ∪ {ε}) → P(Q)** — the transition function maps to the **power set** of Q (a set of possible next states)

**Computation.** An NFA can be in **multiple states simultaneously**. On reading a symbol, each current state branches into all states reachable via that symbol (plus any states reachable via ε-transitions). A string is accepted if **any** branch of computation ends in an accepting state.

**ε-transitions** allow the machine to change state without consuming input. This is not "doing nothing" — it is a powerful modeling tool that enables:
- Optional components in patterns
- Modular composition of sub-automata (Thompson's construction for regex)
- Simpler representations of complex languages

**The Subset Construction (Rabin-Scott, 1959).** Every NFA can be converted to an equivalent DFA. The algorithm constructs a DFA whose states are **subsets** of the NFA's state set. If the NFA has n states, the resulting DFA may have up to **2ⁿ** states (exponential blowup), though in practice it is often much smaller.

This equivalence is one of the most important results in automata theory: **DFAs and NFAs recognize exactly the same class of languages — the regular languages.** NFAs are not more powerful than DFAs; they are simply more concise.

**Practical significance:**
- Regular expressions are compiled to NFAs (Thompson's construction), then optionally converted to DFAs for efficient matching
- The \`grep\`, \`sed\`, and \`awk\` utilities all use this pipeline internally
- Modern regex engines in JavaScript, Python, and Java use NFA-based simulation

> *Reference: Thompson, K. (1968). "Programming Techniques: Regular Expression Search Algorithm." Communications of the ACM, 11(6), 419–422.*`,
  },
  {
    title: "V. Regular Languages & Regular Expressions",
    content: `The **regular languages** form the foundation of the Chomsky Hierarchy (Type 3). They are characterized by a remarkable convergence of equivalent formalisms:

**Kleene's Theorem (1956).** The following are equivalent — they all describe exactly the same class of languages:
1. Languages recognized by **DFAs**
2. Languages recognized by **NFAs**
3. Languages described by **regular expressions**
4. Languages generated by **regular (right-linear) grammars**

**Regular Expressions.** A regular expression over alphabet Σ is built from:
- **∅** — the empty language
- **ε** — the language {ε}
- **a** (for a ∈ Σ) — the language {a}
- **R₁ | R₂** (union) — L(R₁) ∪ L(R₂)
- **R₁R₂** (concatenation) — L(R₁) · L(R₂)
- **R\\*** (Kleene star) — L(R)\\*

For example, \`(a|b)*abb\` describes all strings over {a, b} that end with "abb".

**Closure Properties.** Regular languages are closed under union, intersection, complement, concatenation, Kleene star, reversal, homomorphism, inverse homomorphism, difference, and symmetric difference. This rich set of closure properties makes regular languages extremely well-behaved and amenable to algorithmic manipulation.

**The Pumping Lemma for Regular Languages.** If L is regular, then there exists a constant p (the "pumping length") such that any string w ∈ L with |w| ≥ p can be decomposed as w = xyz where: (1) |y| > 0, (2) |xy| ≤ p, and (3) for all i ≥ 0, xyⁱz ∈ L. This lemma is the primary tool for proving that a language is **not** regular.

**Decision Problems.** For regular languages, the following are all decidable (and efficient):
- **Membership**: Is w ∈ L? — O(|w|) time
- **Emptiness**: Is L = ∅? — O(|Q|) time
- **Equivalence**: Is L₁ = L₂? — O(n log n) time (Hopcroft's algorithm)
- **Minimization**: Find the smallest DFA for L — O(n log n) time

> *Reference: Kleene, S. C. (1956). "Representation of Events in Nerve Nets and Finite Automata." In Automata Studies, Princeton University Press.*`,
  },
  {
    title: "VI. Context-Free Grammars (CFG)",
    content: `**Context-Free Grammars** are the generative counterpart to Pushdown Automata. They describe languages by specifying rules for how strings can be produced, rather than how they can be recognized.

**Formal Definition.** A CFG is a 4-tuple **G = (V, Σ, R, S)** where:
- **V** — a finite set of **variables** (non-terminal symbols)
- **Σ** — a finite set of **terminal symbols** (the alphabet; V ∩ Σ = ∅)
- **R** — a finite set of **production rules** of the form A → α, where A ∈ V and α ∈ (V ∪ Σ)\\*
- **S ∈ V** — the **start symbol**

**Derivation.** Starting from S, we repeatedly replace a variable with the right-hand side of one of its production rules until only terminal symbols remain. The set of all strings derivable from S is the language **L(G)**.

**Example — Balanced Parentheses:** S → (S) | SS | ε. This grammar generates: ε, (), (()), ()(), (())(), ((())), ...

**Example — Arithmetic Expressions:** E → E + T | T; T → T × F | F; F → (E) | id. This grammar captures operator precedence (× binds tighter than +) and associativity through its structure.

**Parse Trees & Ambiguity.** A derivation can be visualized as a **parse tree**. A grammar is **ambiguous** if some string has more than one parse tree. Some languages are **inherently ambiguous** (every grammar for them is ambiguous).

**Normal Forms:**
- **Chomsky Normal Form (CNF)**: Every rule is A → BC or A → a. Used in the CYK parsing algorithm (O(n³) time).
- **Greibach Normal Form (GNF)**: Every rule is A → aα where a ∈ Σ. Used in theoretical proofs.

**The Pumping Lemma for CFLs.** Analogous to the regular pumping lemma but with a "two-pump" structure: any sufficiently long string in a CFL can be decomposed as w = uvxyz where uv²xy²z is also in the language. This proves, for example, that {aⁿbⁿcⁿ | n ≥ 0} is not context-free.

> *Reference: Chomsky, N. (1956). "Three Models for the Description of Language." IRE Transactions on Information Theory, 2(3), 113–124.*`,
  },
  {
    title: "VII. Pushdown Automata (PDA)",
    content: `A **Pushdown Automaton (PDA)** extends a finite automaton with an auxiliary **stack** — an unbounded last-in-first-out (LIFO) memory structure. This stack gives PDAs the ability to recognize context-free languages, which finite automata cannot.

**Formal Definition.** A PDA is a 7-tuple **M = (Q, Σ, Γ, δ, q₀, Z₀, F)** where:
- **Q** — a finite set of states
- **Σ** — the input alphabet
- **Γ** — the stack alphabet
- **δ: Q × (Σ ∪ {ε}) × Γ → P(Q × Γ\\*)** — the transition function
- **q₀ ∈ Q** — the initial state
- **Z₀ ∈ Γ** — the initial stack symbol
- **F ⊆ Q** — the set of accepting states

Each transition reads an input symbol (or ε), pops the top stack symbol, and pushes zero or more symbols onto the stack. The transition function is non-deterministic.

**Equivalence with CFGs.** The languages recognized by PDAs are exactly the context-free languages. For every CFG G, there exists a PDA M such that L(M) = L(G), and vice versa.

**Deterministic vs. Non-deterministic PDAs.** Unlike finite automata, **DPDAs are strictly weaker than NPDAs**. The deterministic context-free languages are a proper subset of the context-free languages. For example, the language of palindromes {wwᴿ | w ∈ {a,b}\\*} requires non-determinism.

**What PDAs can recognize:** balanced parentheses, aⁿbⁿ, palindromes (with non-determinism), most programming language syntax.

**What PDAs cannot recognize:** aⁿbⁿcⁿ (requires two independent counters), {ww | w ∈ Σ\\*} (string duplication), the intersection of two context-free languages.

> *Reference: Hopcroft, J. E., Motwani, R. & Ullman, J. D. (2006). Introduction to Automata Theory, Languages, and Computation (3rd ed.), Chapter 6.*`,
  },
  {
    title: "VIII. Turing Machines",
    content: `The **Turing Machine** (TM), introduced by Alan Turing in 1936, is the most powerful standard model of computation. It captures the intuitive notion of "what can be computed by an algorithm" and serves as the theoretical foundation for all modern computers.

**Formal Definition.** A TM is a 7-tuple **M = (Q, Σ, Γ, δ, q₀, q_accept, q_reject)** where:
- **Q** — a finite set of states
- **Σ** — the input alphabet (not including the blank symbol ⊔)
- **Γ** — the tape alphabet (Σ ⊂ Γ, includes ⊔)
- **δ: Q × Γ → Q × Γ × {L, R}** — the transition function (read, write, move)
- **q₀** — the start state
- **q_accept** — the accept state (halts and accepts)
- **q_reject** — the reject state (halts and rejects)

**The Tape.** A TM operates on an infinite tape divided into cells. Initially, the input string occupies the leftmost cells, and all remaining cells contain the blank symbol ⊔. The read/write head starts at the leftmost cell and can move one cell left or right per step.

**The Church-Turing Thesis.** Any function that can be computed by an "effective procedure" (algorithm) can be computed by a Turing Machine. Every alternative model of computation — lambda calculus, recursive functions, register machines, quantum computers (for decision problems) — has been shown to be equivalent in power to Turing Machines.

**Decidability & Recognizability:**
- A language is **decidable** (recursive) if some TM always halts and correctly accepts/rejects
- A language is **recognizable** (recursively enumerable) if some TM accepts all strings in the language (but may loop on strings not in the language)
- There exist languages that are recognizable but not decidable (e.g., the Halting Problem)
- There exist languages that are not even recognizable

**The Halting Problem.** The most famous undecidable problem: given a TM M and input w, does M halt on w? Turing proved (1936) by diagonalization that no TM can decide this for all M and w.

> *Reference: Turing, A. M. (1936). "On Computable Numbers, with an Application to the Entscheidungsproblem." Proceedings of the London Mathematical Society, 2(42), 230–265.*`,
  },
  {
    title: "IX. The Chomsky Hierarchy",
    content: `The **Chomsky Hierarchy**, introduced by Noam Chomsky in 1956, classifies formal languages into four nested levels based on the generative power of their grammars and the computational power of the machines required to recognize them.

- **Type 3 — Regular Languages.** Recognized by Finite Automata (DFA/NFA). Generated by right-linear grammars (A → aB or A → a). Example: \`(ab)*\`.
- **Type 2 — Context-Free Languages.** Recognized by Pushdown Automata. Generated by context-free grammars (A → α, single variable on left). Example: \`aⁿbⁿ\`.
- **Type 1 — Context-Sensitive Languages.** Recognized by Linear Bounded Automata. Generated by context-sensitive grammars (αAβ → αγβ, |γ| ≥ 1). Example: \`aⁿbⁿcⁿ\`.
- **Type 0 — Recursively Enumerable Languages.** Recognized by Turing Machines. Generated by unrestricted grammars (α → β). Example: the Halting Problem.

**Strict containment:** Type 3 ⊂ Type 2 ⊂ Type 1 ⊂ Type 0. Each level strictly contains the one below it.

**Beyond Type 0.** Not all languages are recursively enumerable. The set of all languages over a finite alphabet is uncountably infinite, while the set of all Turing Machines is only countably infinite — so "most" languages have no computational characterization at all.

**Closure properties by type:**

- **Regular languages** are closed under union, intersection, complement, concatenation, and Kleene star — all five operations.
- **Context-free languages** are closed under union, concatenation, and Kleene star, but **not** under intersection or complement.
- **Context-sensitive languages** are closed under union, intersection, complement, concatenation, and Kleene star.
- **Recursively enumerable languages** are closed under union, intersection, concatenation, and Kleene star, but **not** under complement.

> *Reference: Chomsky, N. (1959). "On Certain Formal Properties of Grammars." Information and Control, 2(2), 137–167.*`,
  },
  {
    title: "X. Recursive State Machines (RSM)",
    content: `**Recursive State Machines** (RSMs), formalized by Alur and Yannakakis (2001), extend finite automata with **sub-automaton calls**. An RSM is a tuple of component machines where each component can contain **box nodes** (call states) that invoke other components — including themselves, enabling recursion.

**Formal Definition.** An RSM is a tuple **A = (A₁, A₂, ..., Aₖ)** where each component Aᵢ = (Nᵢ, Bᵢ, Yᵢ, Enᵢ, Exᵢ, δᵢ) consists of nodes, boxes (call states), call/return ports, entry/exit nodes, and a transition relation.

When execution reaches a box node, the RSM **pushes** the current state onto an implicit call stack and begins executing the target component. When the target reaches an exit node, the RSM **pops** the stack and resumes the caller.

**Computational Power — The Key Results:**
1. **RSM over FAs (no recursion)**: Calls can be inlined → **Regular (Type 3)**
2. **RSM over FAs (with recursion)**: Implicit call stack = pushdown stack → **Context-Free (Type 2)**
3. **RSM over PDAs (with recursion)**: Multiple independent stacks → **Recursively Enumerable (Type 0)**
4. **RSM involving TMs**: Already Turing-complete → **Recursively Enumerable (Type 0)**

**Why RSMs matter:**
- They model **procedural abstraction** — subroutines, functions, and methods
- They enable **modular automaton design** — decompose complex machines into reusable components
- They provide a formal framework for **interprocedural program analysis**
- They are the theoretical basis for **recursive descent parsers** and **visibly pushdown languages**

**TSFlap's RSM implementation** allows you to create multiple automata in separate tabs and link them via call states. Right-click a node → "Set as Call State" to designate it as a box node. The system supports both **accept/reject** mode (binary return) and **exit-mapped** mode (multiple return ports per box).

> *Reference: Alur, R. & Yannakakis, M. (2001). "Analysis of Recursive State Machines." ACM TOPLAS, 23(6), 731–782.*`,
  },
  {
    title: "XI. Multi-Automata Operations & Closure Properties",
    content: `TSFlap implements several fundamental operations on automata that demonstrate closure properties and enable compositional design.

**Cross Product Construction.** Given two DFAs, the cross product constructs a new DFA that simulates both simultaneously. The state set is Q₁ × Q₂. By choosing different acceptance conditions, the same construction yields **union**, **intersection**, and **difference**.

**Equivalence Testing.** Two DFAs are equivalent iff they recognize the same language. TSFlap tests this by constructing the symmetric difference and checking emptiness.

**Union via ε-transitions.** For NFAs, PDAs, and TMs, union is achieved by adding a new initial state with ε-transitions to both machines' initial states.

**NFA → DFA Conversion (Subset Construction).** The Rabin-Scott subset construction converts any NFA to an equivalent DFA. Each DFA state represents a set of NFA states. The algorithm explores all reachable subsets via ε-closure and symbol transitions.

**DFA → Regular Expression (State Elimination).** TSFlap converts FAs to equivalent regular expressions by eliminating states one by one and replacing transitions with regex that capture all paths through the removed state.

**Regex → NFA (Thompson's Construction).** Regular expressions are converted to NFAs compositionally — base cases for symbols and ε, inductive cases for union (\`|\`), concatenation, and Kleene star (\`*\`).`,
  },
  {
    title: "XII. The TSFlap Simulator — Complete Guide",
    content: `TSFlap is a fully interactive automaton design and simulation environment. This section covers every feature.

**Workspace & Tabs.** TSFlap uses a tabbed workspace where each tab contains an independent automaton. Tabs can be FA, PDA, or TM and can reference each other via call states to form RSMs. Double-click a tab name to rename it. The power class badge shows the Chomsky type scoped to the active tab's reachable components.

**Modes:**
- **Draw Mode** (\`D\`) — Click empty space to create states. Click-drag between states to create transitions. Drag from a state to itself for self-loops.
- **Move Mode** (\`M\`) — Drag states to reposition. Drag canvas to pan. Drag edge control points to curve transitions.
- **Erase Mode** (\`E\`) — Click states or transitions to delete them.

**State Configuration.** Right-click any state for the context menu:
- **Set as Initial** — marks the start state (arrow from nowhere)
- **Toggle Final** — toggles the double-circle accepting state
- **Set as Call State** — opens the sub-automaton picker for RSM box nodes
- **Rename** / **Delete**

**Transitions.** When creating a transition, enter the symbol(s). Multiple symbols separated by commas. For PDAs: \`input, stackPop / stackPush\`. For TMs: \`read / write, direction\`.

**Quick Testing Panel.** The floating panel lets you add test strings and see accept/reject results in real time. Green = accepted, red = rejected. Add multiple test cases and see counts at a glance.

**Step-by-Step Simulation.** The simulation panel lets you step through execution one transition at a time, visualizing the current state, input position, and (for PDAs) stack contents. Supports RSM call stack visualization for sub-automaton calls.

**Layout Tools:**
- **Circle Layout** — arranges nodes in a circle by BFS distance from the initial state
- **Tree Layout** — arranges nodes in a tree rooted at the initial state
- **Force-Directed Layout** — physics simulation for aesthetically pleasing arrangement
- **Align to Grid** — snaps all nodes to the nearest grid point

**Conversion Tools (FA only):**
- **Remove Unreachable States** — deletes states not reachable from the initial state
- **Convert NFA → DFA** — applies the subset construction algorithm
- **Export FA to Regex** — state elimination algorithm
- **Import from Regex** — Thompson's construction

**Multi-Automata Operations (FA only):**
- **Union / Intersection / Difference** with another FA in the workspace (cross product)
- **Test Equivalence** between two FAs

**Import & Export:**
- **Formal Definition** — text-based 5-tuple/7-tuple notation
- **LaTeX (TikZ)** — export to TikZ automata notation for academic papers
- **PNG Image** — rasterized export of the canvas
- **Import from Formal Definition** — parse a definition string into an automaton
- **Import from LaTeX** — parse TikZ automata notation

**Command Palette** (\`⌘K\`) — fuzzy-search all available commands. Keyboard shortcuts: \`D\` Draw, \`M\` Move, \`E\` Erase, \`⌘Z\` Undo, \`⌘⇧Z\` Redo, \`?\` Keyboard shortcuts reference.

**Themes.** Switch between Modern and Classic visual themes via View → Theme.

**Determinism Toggle.** Switch between deterministic and non-deterministic mode for the active automaton. In deterministic mode, the simulator enforces single transitions per symbol.`,
  },
  {
    title: "XIII. Practical Applications",
    content: `Formal automata power real-world systems across every domain of computing:

**Compilers & Interpreters.** The lexical analysis phase uses DFAs to tokenize source code. Parser generators (Yacc, Bison, ANTLR) construct PDAs from context-free grammars. The entire compilation pipeline — from source text to machine code — is grounded in automata theory.

**Regular Expressions.** Every regex engine compiles patterns into finite automata. The \`grep\`, \`sed\`, \`awk\`, and \`perl\` utilities, as well as regex support in JavaScript, Python, Java, and Go, all rely on Thompson's NFA construction or its derivatives.

**Network Protocols.** TCP state machines, HTTP request parsing, TLS handshakes, and protocol validation all use finite state machines. The formal specification of many protocols (e.g., RFC documents) includes explicit state diagrams.

**Hardware Design.** Digital circuits — traffic light controllers, vending machines, CPU control units, bus arbiters — are modeled as finite state machines. Hardware description languages (Verilog, VHDL) directly encode FSMs.

**Software Verification.** Model checking tools (SPIN, NuSMV, TLA+) use automata-theoretic techniques to verify that software and hardware systems satisfy correctness properties. The intersection of a system model (automaton) with a property specification (also an automaton) determines whether violations exist.

**Game AI & Robotics.** Character behavior in video games (idle → patrol → chase → attack) and robot control systems use hierarchical state machines. Behavior trees in modern game engines are a generalization of FSMs.

**Natural Language Processing.** Morphological analyzers use finite transducers to process word forms. Probabilistic context-free grammars (PCFGs) extend CFGs for statistical parsing of natural language.

**Bioinformatics.** Hidden Markov Models (HMMs) — a probabilistic extension of finite automata — are used for gene finding, protein structure prediction, and sequence alignment. The Viterbi algorithm, which finds the most likely state sequence in an HMM, is a direct application of automata theory.

**Database Query Languages.** SQL query optimization uses automata-theoretic techniques. XPath and XQuery for XML processing are based on tree automata. Regular path queries in graph databases use finite automata over edge labels.`,
  },
  {
    title: "XIV. References & Further Reading",
    content: `**Foundational Texts:**
- Hopcroft, J. E., Motwani, R. & Ullman, J. D. (2006). *Introduction to Automata Theory, Languages, and Computation* (3rd ed.). Pearson.
- Sipser, M. (2012). *Introduction to the Theory of Computation* (3rd ed.). Cengage Learning.
- Kozen, D. C. (1997). *Automata and Computability*. Springer.

**Key Papers:**
- Turing, A. M. (1936). "On Computable Numbers, with an Application to the Entscheidungsproblem." *Proceedings of the London Mathematical Society*, 2(42), 230–265.
- Chomsky, N. (1956). "Three Models for the Description of Language." *IRE Transactions on Information Theory*, 2(3), 113–124.
- Rabin, M. O. & Scott, D. (1959). "Finite Automata and Their Decision Problems." *IBM Journal of Research and Development*, 3(2), 114–125.
- Kleene, S. C. (1956). "Representation of Events in Nerve Nets and Finite Automata." In *Automata Studies*, Princeton University Press.
- Thompson, K. (1968). "Programming Techniques: Regular Expression Search Algorithm." *Communications of the ACM*, 11(6), 419–422.
- Alur, R. & Yannakakis, M. (2001). "Analysis of Recursive State Machines." *ACM TOPLAS*, 23(6), 731–782.
- Hopcroft, J. E. & Ullman, J. D. (1979). *Introduction to Automata Theory, Languages, and Computation*. Addison-Wesley.`,
  },
];

export const TSFlapPage: FunctionComponent = () => {
  const navigate = useNavigate();

  const scrollToDocumentation = () => {
    const element = document.getElementById(DOCUMENTATION_ID);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Hero Section */}
      <PageSectionBackground color="header">
        <PageSectionContent className="mt-[80px] flex flex-col items-center py-24 text-center">
          <h2 className="text-6xl leading-tight font-bold sm:text-7xl">
            Dive into the world of
            <br />
            <span className="text-primary">Formal Languages</span>
          </h2>

          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-gray-500">
            From simple finite automata to Recursive State Machines, explore the full Chomsky hierarchy through interactive graph diagrams,
            step-by-step simulation, multi-automata operations, and rigorous academic theory.
          </p>

          <div className="mt-10 flex gap-4">
            <Button iconName="edit" onClick={() => void navigate(ROUTE_PATHS.TSFLAP_SIMULATOR)} variant="primary">
              Launch Simulator
            </Button>

            <Button iconName="file" onClick={scrollToDocumentation}>
              Explore Documentation
            </Button>
          </div>
        </PageSectionContent>
      </PageSectionBackground>

      {/* Documentation Sections */}
      <div id={DOCUMENTATION_ID}>
        {docSections.map((section, index) => (
          <PageSectionBackground color={index % 2 === 0 ? "section" : "header"} key={index}>
            <PageSectionContent>
              <LinkableSection title={section.title}>
                <Markdown className="text-lg leading-relaxed">{section.content}</Markdown>
              </LinkableSection>
            </PageSectionContent>
          </PageSectionBackground>
        ))}
      </div>

      {/* Call to Action */}
      <PageSectionBackground color="header">
        <PageSectionContent className="flex flex-col items-center py-16 text-center">
          <Box variant="h2" fontSize="display-l">
            Ready to build your first automaton?
          </Box>
          <p className="mt-4 mb-8 max-w-2xl text-lg text-gray-500">
            Jump into the interactive simulator and start creating finite automata, pushdown automata, Turing machines, and recursive state
            machines — testing input strings, exploring closure properties, and discovering the foundations of computation.
          </p>
          <Button iconName="edit" onClick={() => void navigate(ROUTE_PATHS.TSFLAP_SIMULATOR)} variant="primary">
            Launch Simulator
          </Button>
        </PageSectionContent>
      </PageSectionBackground>
    </>
  );
};
