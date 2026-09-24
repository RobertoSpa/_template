# The sources of the rules

Each rule of a rule file names its cause in one sentence. `RULE_FILES` in `scripts/rules.ts` is the list of the rule files. This file names the document behind that cause.

Read this file before you change a rule. Read it also when you must know if the cause of a rule stays correct. The status of APCA and the status of the WCAG 3 draft change with no commit here. The plan limits of GitHub do the same.

## Both pipelines

- [MISRA Compliance:2020](https://misra.org.uk). The categories mandatory, required, and advisory, the deviation record, and the split between a decidable rule and an undecidable rule.
- [14 CFR 91.213](https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-C/section-91.213), the minimum equipment list and its repair deadline categories. The categories give the expiry of a deviation record and of an attestation record.
- [The WHO surgical safety checklist, 2009](https://www.who.int/docs/default-source/patient-safety/9789241598590-eng-checklist.pdf). The sign-in.

## The accessibility rules

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), the W3C Recommendation of 5 October 2023, with the update of 12 December 2024. [What is new in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), which names the nine new criteria and the removal of 4.1.1 Parsing.
- [The ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/), which gives the key map of each pattern. [Read me first](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/), which gives the first rule of ARIA.
- [ARIA in HTML](https://www.w3.org/TR/html-aria/), the W3C Recommendation of 11 August 2026, which says which role is valid on which element.
- [Accessible Name and Description Computation 1.2](https://www.w3.org/TR/accname-1.2/), which gives the sequence of rule NAME-04.
- [The WebAIM Million 2025](https://webaim.org/projects/million/2025). 94.8 percent of home pages had one detectable failure or more. Low contrast was on 79.1 percent. A page with ARIA had 57 errors, and a page with none had 27.
- The ceiling of the tools. Deque measures 29.5 percent of the WCAG 2.2 criteria as fully automatable. It measures 10.3 percent as automatable in part, and 60.2 percent as manual.
- [DO-178C](https://en.wikipedia.org/wiki/DO-178C). The objective with independence, which gives rule ATT-04.
- [IEC 62304](https://blog.johner-institute.com/iec-62304-medical-software/safety-class-iec-62304/). Software with no documented safety class gets class C, which gives rule CLS-03.
- [ISO 26262](https://en.wikipedia.org/wiki/Automotive_Safety_Integrity_Level). The three axes severity, exposure, and controllability, which give the axes of the class of a route.
- [The INCOSE Guide to Writing Requirements](https://spacese.spacegrant.org/uploads/Requirements-Writing/Writing%20Good%20Requirements.pdf). One rule per statement, the four verification methods, and the words that no person can test.
- [The IBM user interface standard of 1987](https://en.wikipedia.org/wiki/IBM_Common_User_Access). Tab moves between two groups, and the arrow keys move in one group, which gives rule KEY-06.
- [Raymond, The Art of Unix Programming](http://www.catb.org/esr/writings/taoup/html/). The rule that gives CON-05.
- [Nielsen, the ten usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics-for-user-interface-design/). Heuristic 4, consistency and standards, which gives rule CON-02.
- [Doherty and Thadani, IBM Systems Journal, 1982](https://lawsofux.com/doherty-threshold/). The threshold of 400 ms, which gives rule MOT-07.
- [Cumulative Layout Shift](https://web.dev/articles/cls). The good band is 0.1 or less. Rule SIZE-08 gives 0.
- [The status of APCA](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html). The contrast algorithm went out of the WCAG 3 draft in 2023, and the draft of September 2026 names none, which gives rule COLOR-07.
- [The WCAG 3 explainer](https://www.w3.org/WAI/news/2026-09-10/wcag3/), a Working Draft with no date for a Recommendation. This pipeline uses WCAG 2.2 alone.

## The security rules

- [FAA AC 120-71B](https://www.faa.gov/documentlibrary/media/advisory_circular/ac_120-71b.pdf), the challenge-response checklist, and the answer as the state that the reader sees.
- [14 CFR 121.542](https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-121/subpart-T/section-121.542), the sterile flight deck rule.
- [DOE-HDBK-1028-2009](https://www.standards.doe.gov/standards-documents/1000/1028-BHdbk-2009-v2), the human performance handbook. STAR, the three-way repeat-back, the peer check, stop when unsure, and conservative decision making.
- [The DoD nuclear surety handbook, 2020, chapter 8](https://www.acq.osd.mil/ncbdp/nm/NMHB2020rev/chapters/chapter8.html), the two-person concept.
- [Holzmann, The Power of Ten, JPL 2006](https://spinroot.com/gerard/pdf/P10.pdf).
- [The Apollo 11 flight mission rules](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/A11MissionRules.pdf). Number, condition, action, rationale.
- [The NQF list of reportable events](https://www.qualityforum.org/Topics/SREs/List_of_SREs.aspx), the never-events.
- [SEC Rule 15c3-5](https://www.ecfr.gov/current/title-17/chapter-II/part-240/subpart-A/subject-group-ECFR541343e5c1fa459/section-240.15c3-5), market access controls. [SEC order 34-70694](https://www.sec.gov/files/litigation/admin/2013/34-70694.pdf), Knight Capital.
- [The Toyota production system](https://global.toyota/en/company/vision-and-philosophy/production-system/index.html), jidoka and andon.
- [The Google SRE book, postmortem culture](https://sre.google/sre-book/postmortem-culture/). [The AWS Builders Library, safe hands-off deployments](https://aws.amazon.com/builders-library/automating-safe-hands-off-deployments/).
- [The OpenBSD security page](https://www.openbsd.org/security.html) and [pledge(2)](https://man.openbsd.org/pledge.2). Tight by default, audit file by file, remove the feature.
- [Bernstein, ten years of qmail](https://cr.yp.to/qmail/qmailsec-20071101.pdf). Remove trusted code, do not parse.
- [The Linux kernel patch rules](https://www.kernel.org/doc/html/latest/process/submitting-patches.html). No regressions, one logical change.
- [How SQLite is tested](https://www.sqlite.org/testing.html). Each bug adds a test.
- [Tiger Style](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md). A limit on everything.
- [Software Engineering at Google, chapter 9](https://abseil.io/resources/swe-book/html/ch09.html) and [chapter 16](https://abseil.io/resources/swe-book/html/ch16.html). [Winters, non-atomic refactoring](https://abseil.io/resources/wapi18-winters.pdf).
- [Language-theoretic security](https://en.wikipedia.org/wiki/Language-theoretic_security). [King, parse, do not validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/). [RFC 9413](https://datatracker.ietf.org/doc/html/rfc9413).
- [McKinley, boring technology](https://mcfunley.com/choose-boring-technology). [Chesterton's fence](https://en.wikipedia.org/wiki/Chesterton%27s_fence). [Hyrum's law](https://www.hyrumslaw.com/).
- The standards. [OpenSSF Scorecard](https://github.com/ossf/scorecard/blob/main/docs/checks.md). [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/). [CISA 2026 SBOM minimum elements](https://www.cisa.gov/resources-tools/resources/2026-minimum-elements-software-bill-materials-sbom).
- The GitHub plan limits. [Rulesets are paid on a private repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets). [Artifact attestations are Enterprise only on a private repository](https://docs.github.com/en/actions/concepts/security/artifact-attestations).
- The npm compromises of 2025 and 2026. [tj-actions](https://www.wiz.io/blog/github-action-tj-actions-changed-files-supply-chain-attack-cve-2025-30066), [nx](https://securitylabs.datadoghq.com/articles/learnings-from-recent-npm-compromises/), [chalk and debug](https://www.wiz.io/blog/widespread-npm-supply-chain-attack-breaking-down-impact-scope-across-debug-chalk), [Shai-Hulud 2.0](https://securitylabs.datadoghq.com/articles/shai-hulud-2.0-npm-worm/), [Trivy](https://www.stepsecurity.io/blog/trivy-compromised-a-second-time---malicious-v0-69-4-release), [axios](https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/).

## The resilience rules

- [FAA AC 25.1309-1A](https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_25.1309-1A.pdf), section 5. Each single failure is possible, and its probability does not change that. Isolate the parts, give a failure warning, and design the failure path. One of these alone is seldom sufficient. Rule FIT-01.
- [IAEA INSAG-10, defence in depth](https://www-pub.iaea.org/MTCD/Publications/PDF/Pub1013e_web.pdf), paragraphs 19 to 23. When one level fails, the next level acts. The levels do not depend on each other. Rule BND-01.
- [NASA NPR 7150.2D, SWE-134](https://swehb.nasa.gov/display/SWEHBVD/SWE-134+-+Safety-Critical+Software+Design+Requirements). Start and end in a known safe state. Integrity checks on each input. No single event starts a dangerous condition. Rules NET-03 and SAFE-01.
- [NASA-HDBK-1002, fault management](https://www.nasa.gov/wp-content/uploads/2015/04/636372main_NASA-HDBK-1002_Draft.pdf), section 4.1.1.4. The safing strategy names the safe mode before the flight. The safe mode does not depend on the fault that started it. Rules BND-04 and RACT-01.
- [The Ariane 5 flight 501 report](https://ocw.mit.edu/courses/16-355j-software-engineering-concepts-fall-2005/91f1e550b30b00ad797293f430220f18_ari5fail_ful_rep.pdf). The decision to stop the processor was the one that killed the flight. Recommendations R3, R6, and R7. Rules NET-04 and DET-02.
- [The BEA report on AF447](https://bea.aero/fileadmin/documents/docspa/2009/f-cp090601.en/pdf/f-cp090601.en.pdf), section 1.6.9. The three control laws, from full protection to none. Each step drops named protections. The key `routes.modes`.
- [The FAA review of the 737 MAX](https://www.faa.gov/sites/faa.gov/files/2022-08/737_RTS_Summary.pdf), safety items 1 and 2. Two sensors must agree, and one command only. Rule SAFE-05.
- [Leveson and Turner, the Therac-25 accidents](https://escholarship.org/content/qt5dr206s3/qt5dr206s3.pdf). The audit trail is a design input. The message `MALFUNCTION 54` told the operator nothing. Rules ERR-04 and DET-03.
- [IEC 60601-1, section 4.7](https://cdn.standards.iteh.ai/samples/13544/14d96fff795e4418aca79ffaa0a72d86/IEC-60601-1-2005.pdf), the single fault condition. Each single fault is simulated. A fault that nothing detects is present. Rules FIT-01 and FIT-02.
- [49 CFR 236.5](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-II/part-236/subpart-A/section-236.5), the closed-circuit principle. A signal with no power shows the most restrictive aspect. Rule SAFE-03.
- [SEC order 34-70694](https://www.sec.gov/files/litigation/admin/2013/34-70694.pdf), Knight Capital, paragraphs 21 and 42. No procedure said when to disconnect. [FIA, automated trading risk controls, 2024](https://www.fia.org/sites/default/files/2024-07/FIA_WP_AUTOMATED%20TRADING%20RISK%20CONTROLS_FINAL_0.pdf), section 1.5, the kill switch. Rule SAFE-06.
- The AWS Builders Library. [A design that is stable with no action](https://aws.amazon.com/builders-library/static-stability-using-availability-zones/), rule SAFE-04. [Avoiding fallback](https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/), rule NET-04. [Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/), rules NET-01 and NET-02.
- The Google SRE book. [Addressing cascading failures](https://sre.google/sre-book/addressing-cascading-failures/), rule NET-02. [Handling overload](https://sre.google/sre-book/handling-overload/), rule NET-05. [Monitoring distributed systems](https://sre.google/sre-book/monitoring-distributed-systems/), rule DET-01.
- [Erlang OTP, supervisor principles](https://www.erlang.org/doc/system/sup_princ.html), `one_for_one`, `MaxR`, and `MaxT`. [Armstrong, the thesis of 2003](https://erlang.org/download/armstrong_thesis_2003.pdf), sections 4.3 and 4.4. Let it crash. Do not program defensively. Rules BND-02, BND-03, and BND-05.
- [Candea and Fox, crash-only software](https://www.usenix.org/legacy/events/hotos03/tech/full_papers/candea/candea.pdf). Stop is crash, and start is the recovery. One recovery path. Rule BND-02.
- [Duffy, the error model of Midori](https://joeduffyblog.com/2016/02/07/the-error-model/). Two classes, a recoverable error and a bug. A bug stops the process. Rule ERR-01.
- [The Rust book, chapter 9.3](https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html). An expected failure returns a `Result`. A broken invariant panics. [The Rust API guidelines](https://rust-lang.github.io/api-guidelines/interoperability.html), C-GOOD-ERR. Rules ERR-01 and ERR-03.
- [Go code review comments](https://go.dev/wiki/CodeReviewComments) and [errors are values](https://go.dev/blog/errors-are-values). Do not discard an error. Handle it, return it, or crash. Rules ERR-02 and ERR-07.
- [The Zig language reference](https://ziglang.org/documentation/master/), the zen and the errors section. A failure to test an error is a compile error. Rule ERR-07.
- [The Elm guide, error handling](https://guide.elm-lang.org/error_handling/). Errors are data. One custom type per possibility. Rule ERR-09.
- [PEP 20](https://peps.python.org/pep-0020/). An error does not pass with no report. Rule ERR-06.
- [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html), the problem shape of an HTTP error. Branch on the type and not on the text. Keep the stack out of the interface. [The Azure REST API guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md), the error code is the contract. Rules ERR-03, ERR-08, and BND-06.
- [OpenBSD style(9)](https://man.openbsd.org/style.9). Use `err(3)`, and do not roll your own. Rule DET-01.
- [The React reference, error boundaries](https://react.dev/reference/react/Component). React removes the tree on a render error. A boundary catches no event handler and no asynchronous code. Rule BND-01.
- [typescript-eslint, no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/) and [only-throw-error](https://typescript-eslint.io/rules/only-throw-error/). [The TSConfig reference, useUnknownInCatchVariables](https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html). Rules ERR-05 and ERR-06.
- [The principles of chaos engineering](https://principlesofchaos.org/). Run the experiment continuously. Rule FIT-03.
