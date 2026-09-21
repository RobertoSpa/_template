# The sources of the rules

Each rule of `docs/agents/accessibility.md` and of `docs/agents/security.md` names its cause in one sentence. This file names the document behind that cause.

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
