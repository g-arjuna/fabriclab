import { expect, test, type Page } from "@playwright/test";

async function openOperations(page: Page, lesson: string) {
  await page.goto(`/practical/rdma?lesson=${lesson}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
}

async function advance(page: Page, count: number) {
  for (let index = 0; index < count; index += 1) {
    await expect(page.getByTestId("lesson-action")).toBeEnabled();
    await page.getByTestId("lesson-action").click();
  }
}

test.describe("Operations V2 evidence semantics", () => {
  test("SEND setup, RNR fork, packet, independent completions and exact verified bytes are evidence-bound", async ({ page }) => {
    await openOperations(page, "send-receive");
    await advance(page, 1);

    await expect(page.getByTestId("visual-5-2")).not.toContainText("recorded final QP RTS");
    await page.getByTestId("open-device-resources").click();
    await expect(page.getByTestId("visual-5-2")).toContainText("QP created in RESET");
    await expect(page.getByTestId("visual-5-2")).not.toContainText("recorded final QP RTS");
    await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-kind", "none");
    await page.getByTestId("exchange-endpoint-metadata").click();
    await expect(page.getByTestId("visual-5-2")).toContainText("metadata known · QP not yet configured as ready");
    await expect(page.getByTestId("visual-5-2")).not.toContainText("recorded final QP RTS");
    await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-kind", "control");
    await expect(page.getByTestId("focus-transfer")).toContainText(/endpoint metadata over TCP/i);
    await expect(page.getByTestId("visual-5-2")).not.toContainText(/SEND packet|WRITE packet|READ packet/);
    await page.getByTestId("prepare-qps").click();
    await expect(page.getByTestId("visual-5-2")).toContainText("At resource creation");
    await expect(page.getByTestId("visual-5-2")).toContainText("After endpoint preparation");
    await expect(page.getByTestId("visual-5-2")).toContainText("recorded final QP RTS");
    await expect(page.getByTestId("metadata-exchange-history")).toContainText(/TCP control history/i);
    await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-kind", "none");

    await advance(page, 1);

    await expect(page.getByTestId("send-receive-wr-card")).toHaveCount(0);
    await page.getByTestId("describe-receive-memory").click();
    await expect(page.getByTestId("receive-wr-lifecycle")).toHaveAttribute("data-stage", "constructed");
    await expect(page.getByTestId("receive-application-construction")).toContainText(/outside the Receive Queue/i);
    await expect(page.getByTestId("visual-5-3")).toContainText("no posted receive WR");
    await page.getByTestId("post-receive-request").click();
    await expect(page.getByTestId("receive-wr-lifecycle")).toHaveAttribute("data-stage", "posted");
    await expect(page.getByTestId("send-receive-wr-card")).toContainText("wr:b:hostb:exp-b-receiver:4");
    await expect(page.getByTestId("send-receive-wr-card")).toContainText("length: 4096");
    await page.getByTestId("tell-a-ready").click();
    await expect(page.getByTestId("visual-5-3")).toContainText("b:hosta:exp-b-sender:4");
    await expect(page.getByTestId("visual-5-3")).not.toContainText("b:packet:3");

    await advance(page, 1);
    await page.getByTestId("try-send-no-receive").click();
    await expect(page.getByTestId("missing-receive-state")).toContainText(/receiver not ready/i);
    await expect(page.getByTestId("missing-receive-state")).toContainText(/no byte placement and no successful CQE/i);
    await expect(page.getByTestId("visual-5-4")).not.toContainText(/captured RNR|RNR frame/i);
    await page.getByTestId("prepare-receive-work").click();
    await expect(page.getByTestId("missing-receive-state")).toContainText(/prepared before the real SEND/i);

    await advance(page, 1);
    await page.getByTestId("write-bytes-a-buffer").click();
    await expect(page.getByTestId("send-payload-exact-bytes")).toContainText("50 bytes");
    await expect(page.getByTestId("send-payload-exact-bytes")).toContainText("\\n");
    await expect(page.getByTestId("visual-5-5")).not.toContainText("The application has submitted the instruction");
    await page.getByTestId("construct-send-instruction").click();
    await expect(page.getByTestId("send-wr-lifecycle")).toHaveAttribute("data-stage", "constructed");
    await expect(page.getByTestId("send-application-construction")).toContainText(/outside the Send Queue/i);
    await expect(page.getByTestId("visual-5-5")).toContainText("no posted SEND WR");
    await expect(page.getByTestId("actual-send-wr")).toContainText("wr:b:hosta:exp-b-sender:5");
    await expect(page.getByTestId("actual-send-wr")).toContainText("length: 50");
    await page.getByTestId("submit-to-send-queue").click();
    await expect(page.getByTestId("send-wr-lifecycle")).toHaveAttribute("data-stage", "posted");
    await expect(page.getByTestId("visual-5-5")).toContainText("The application has submitted the instruction");
    await expect(page.getByTestId("visual-5-5")).toContainText(/does not independently sample queue occupancy/i);

    await advance(page, 1);
    await page.getByTestId("inspect-captured-send").click();
    const sendPacket = page.locator('[data-testid="operations-packet-inspector"][data-packet-id="b:packet:3"]');
    await expect(sendPacket).toContainText("SEND Only");
    await expect(sendPacket).toContainText("Application payload bytes");
    await expect(sendPacket).toContainText("50");
    await expect(sendPacket).toContainText("BTH padding bytes");
    await expect(sendPacket).toContainText("2");
    await expect(sendPacket).toContainText("Total frame bytes");
    await expect(sendPacket).toContainText("110");
    await expect(sendPacket).not.toContainText("Remote virtual address");
    await page.getByTestId("follow-placement-b").click();
    await expect(page.getByTestId("send-placement-state")).toContainText(/first 50 bytes/i);
    await expect(page.getByTestId("send-placement-state")).toContainText(/Completion evidence remains separate/i);

    await advance(page, 1);
    await page.getByTestId("inspect-reverse-ack").click();
    const ack = page.locator('[data-testid="send-ack-inspector"][data-packet-id="b:packet:4"]');
    await expect(ack).toContainText("Acknowledge");
    await expect(ack).toContainText("Application payload bytes");
    await expect(ack).toContainText("0");
    await expect(ack).not.toContainText("Remote virtual address");
    await page.getByTestId("observe-a-completion").click();
    await page.getByTestId("observe-b-completion").click();
    await expect(page.getByTestId("send-a-completion")).toContainText("cqe:b:hosta:exp-b-sender:6");
    await expect(page.getByTestId("send-a-completion")).toContainText("Recorded RXE completion byte_len");
    await expect(page.getByTestId("send-b-completion")).toContainText("cqe:b:hostb:exp-b-receiver:5");
    await expect(page.getByTestId("send-b-completion")).toContainText("Received message length");
    await expect(page.getByTestId("send-b-completion")).toContainText("Completion Queue");
    await expect(page.getByTestId("visual-5-7")).toContainText(/independent/i);

    await advance(page, 1);
    await page.getByTestId("read-received-bytes").click();
    await expect(page.getByTestId("send-exact-byte-equality")).toHaveAttribute("data-equal", "true");
    await expect(page.getByTestId("send-exact-byte-equality")).toContainText("50 received bytes / 4096 byte registered capacity");
    await expect(page.getByTestId("send-exact-byte-equality")).toContainText("hex 0a");
    await expect(page.getByTestId("send-local-verification-order")).toContainText("B completion observed");
    await page.getByTestId("toggle-byte-representation").click();
    await expect(page.getByTestId("send-received-hex")).toContainText("0a");
  });

  test("WRITE remote tuple, hidden prediction, zero target poll and exact 53-byte verification are enforced", async ({ page }) => {
    await openOperations(page, "write");
    await advance(page, 2);

    await page.getByTestId("fill-write-source").click();
    await expect(page.getByTestId("write-payload-exact-bytes")).toContainText("53 bytes");
    await expect(page.getByTestId("write-source-line-fill")).toContainText("mr.write");
    await page.getByTestId("describe-write-local-source").click();
    await expect(page.getByTestId("write-source-line-sge")).toContainText("SGE");
    await expect(page.getByTestId("write-application-construction")).toHaveCount(0);
    await expect(page.getByTestId("visual-6-3")).toContainText(/have not yet been attached to the Work Request/i);
    await page.getByTestId("construct-write-instruction").click();
    await expect(page.getByTestId("write-source-line-wr-construction")).toContainText("SendWR");
    await expect(page.getByTestId("write-source-line-remote-attachment")).toHaveCount(0);
    await expect(page.getByTestId("write-construct-explanation")).toContainText(/has not yet been submitted to the Queue Pair/i);
    await expect(page.getByTestId("actual-write-wr")).toHaveAttribute("data-representation", "source-derived");
    await expect(page.getByTestId("actual-write-wr")).toHaveAttribute("data-remote-fields", "not-attached");
    await expect(page.getByTestId("actual-write-wr")).toContainText("length: 53");
    await expect(page.getByTestId("actual-write-wr")).not.toContainText("remote addr:");
    await expect(page.getByTestId("actual-write-wr")).not.toContainText("RKEY:");
    await expect(page.getByTestId("write-memory-descriptions")).not.toContainText("remote destination");
    await expect(page.getByTestId("write-wr-lifecycle")).toHaveAttribute("data-stage", "constructed");
    await expect(page.getByTestId("visual-6-3")).toContainText("no posted WRITE WR");
    await page.getByTestId("attach-write-remote-destination").click();
    await expect(page.getByTestId("write-source-line-remote-attachment")).toContainText("set_wr_rdma");
    await expect(page.getByTestId("write-attach-explanation")).toContainText(/previously supplied by B/i);
    await expect(page.getByTestId("write-memory-descriptions")).toContainText("local source");
    await expect(page.getByTestId("write-memory-descriptions")).toContainText("remote destination");
    await expect(page.getByTestId("actual-write-wr")).toHaveAttribute("data-remote-fields", "included");
    await expect(page.getByTestId("actual-write-wr")).toContainText("remote addr:");
    await expect(page.getByTestId("actual-write-wr")).toContainText("RKEY:");
    await expect(page.getByTestId("visual-6-3")).toContainText(/are now part of A's WRITE Work Request/i);
    await expect(page.getByTestId("visual-6-3")).not.toContainText("The application has submitted the instruction");
    await page.getByTestId("write-final-recorded-inspection").locator("summary").first().click();
    await expect(page.getByTestId("final-recorded-write-wr")).toHaveAttribute("data-representation", "recorded");
    await expect(page.getByTestId("final-recorded-write-wr")).toContainText("wr:c:hosta:exp-c-writer:5");
    await page.getByTestId("submit-write").click();
    await expect(page.getByTestId("write-source-line-post-send")).toContainText("post_send");
    await expect(page.getByTestId("write-submit-explanation")).toContainText(/does not establish that the operation has completed/i);
    await expect(page.getByTestId("write-wr-lifecycle")).toHaveAttribute("data-stage", "posted");
    await expect(page.getByTestId("actual-write-wr")).toHaveAttribute("data-representation", "recorded");
    await expect(page.getByTestId("visual-6-3")).toContainText("The application has submitted the instruction");
    await expect(page.getByTestId("visual-6-3")).toContainText(/submitted WRITE references this registered destination/i);

    await advance(page, 1);
    await page.getByTestId("inspect-write-request").click();
    const request = page.locator('[data-testid="write-request-inspector"][data-packet-id="c:packet:7"]');
    await expect(request).toContainText("RDMA WRITE Only");
    await expect(request).toContainText("Remote virtual address");
    await expect(request).toContainText("DMA length");
    await expect(request).toContainText("53");
    await expect(request).toContainText("BTH padding bytes");
    await expect(request).toContainText("3");
    await expect(request).toContainText("Total frame bytes");
    await expect(request).toContainText("130");
    await page.getByTestId("check-target-access").click();
    await expect(page.getByTestId("write-access-interval")).toContainText("capacity 4096");
    await expect(page.getByTestId("write-access-interval")).toHaveAttribute("data-qpn-match", "true");
    await expect(page.getByTestId("write-access-interval")).toHaveAttribute("data-key-match", "true");
    await expect(page.getByTestId("write-access-interval")).toHaveAttribute("data-range-fits", "true");
    await expect(page.getByTestId("write-access-interval-checks")).toContainText(/remote-write permission/i);
    await page.getByTestId("follow-target-placement").click();
    await expect(page.getByTestId("write-placement-caveat")).toContainText(/no target CQE is fabricated/i);

    await advance(page, 2);
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-prediction", "none");
    await page.getByTestId("target-cqe-predict-yes").click();
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-prediction", "Yes");
    await expect(page.getByTestId("write-prediction-feedback")).toHaveCount(0);
    await expect(page.getByTestId("poll-target-cq")).toBeDisabled();
    await page.getByTestId("follow-write-done-signal").click();
    await page.getByTestId("poll-target-cq").click();
    await expect(page.getByTestId("write-target-zero-poll")).toContainText("c:hostb:exp-c-target:6");
    await expect(page.getByTestId("write-target-zero-poll")).toContainText("npolled=0");
    await expect(page.getByTestId("write-prediction-feedback")).toContainText(/zero entries/i);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-prediction", "Yes");
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-result-revealed", "true");
    await expect(page.getByTestId("target-cqe-prediction-skip")).toBeDisabled();
    await page.getByTestId("target-cqe-predict-no").click();
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-prediction", "Yes");
    await expect(page.getByTestId("write-target-cqe-prediction")).toHaveAttribute("data-review-selection", "No");
    await page.getByTestId("follow-write-done-signal").click();
    await page.getByTestId("poll-target-cq").click();
    await expect(page.getByTestId("write-prediction-feedback")).toContainText(/pre-observation prediction did not match/i);
    await expect(page.getByTestId("write-post-observation-review")).toContainText(/review\/retry, not evidence of a prediction/i);

    await advance(page, 1);
    await page.getByTestId("inspect-write-before-after").click();
    await expect(page.getByTestId("write-memory-exact-comparison")).toHaveAttribute("data-equal", "true");
    await expect(page.getByTestId("write-memory-exact-comparison")).toContainText("53-byte range");
    await expect(page.getByTestId("write-memory-exact-comparison")).toContainText(/beyond the recorded sample are not observed/i);
    await expect(page.getByTestId("write-target-local-order")).toContainText("write_done signal");
    await expect(page.getByTestId("write-target-local-order")).toContainText("poll returned zero");
  });


  test("mechanism interaction tracking ignores container clicks and records meaningful control use", async ({ page }) => {
    await openOperations(page, "write");
    const visual = page.getByTestId("visual-6-1");
    await expect(visual).toHaveAttribute("data-interaction-state", "not-interacted");
    await visual.getByTestId("experiment-position").click();
    await expect(visual).toHaveAttribute("data-interaction-state", "not-interacted");
    expect(await page.evaluate(() => window.localStorage.getItem("fabriclab.rdma.operations-v2.interaction.6.1"))).toBeNull();

    await page.getByTestId("compare-ordinary-write").click();
    await expect(visual).toHaveAttribute("data-interaction-state", "interacted");
    expect(await page.evaluate(() => window.localStorage.getItem("fabriclab.rdma.operations-v2.interaction.6.1"))).toContain("operations-v2-interaction-r1");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid^=guided-lesson-]")).toHaveAttribute("data-hydrated", "true", { timeout: 15000 });
    await expect(page.getByTestId("visual-6-1")).toHaveAttribute("data-interaction-state", "interacted");
    await page.getByRole("button", { name: /restart this lesson/i }).click();
    expect(await page.evaluate(() => window.localStorage.getItem("fabriclab.rdma.operations-v2.interaction.6.1"))).toBeNull();
  });

  test("restart ownership clears operation prediction, quiz and mechanism interaction state without unrelated storage", async ({ page }) => {
    await openOperations(page, "write");
    await page.getByTestId("compare-ordinary-write").click();
    expect(await page.evaluate(() => window.localStorage.getItem("fabriclab.rdma.operations-v2.interaction.6.1"))).toContain("operations-v2-interaction-r1");
    await page.evaluate(() => {
      window.localStorage.setItem("fabriclab.rdma.operations-v2.6.6.prediction", JSON.stringify({ prediction: "No", skipped: false, resultRevealed: true, revision: "operations-v2-prediction-r1" }));
      window.localStorage.setItem("fabriclab.rdma.operations-v2.quiz.write-evidence-review", JSON.stringify({ selected: 1, revealed: true, skipped: false, revision: "operations-v2-quiz-r1" }));
      window.localStorage.setItem("fabriclab.rdma.operations-v2.interaction.6.3", JSON.stringify({ interacted: true, revision: "operations-v2-interaction-r1" }));
      window.localStorage.setItem("fabriclab.unrelated-user-preference", "preserve");
    });
    await page.getByRole("button", { name: /restart this lesson|restart/i }).first().click();
    const ownership = await page.evaluate(() => ({
      prediction: window.localStorage.getItem("fabriclab.rdma.operations-v2.6.6.prediction"),
      quiz: window.localStorage.getItem("fabriclab.rdma.operations-v2.quiz.write-evidence-review"),
      interaction: window.localStorage.getItem("fabriclab.rdma.operations-v2.interaction.6.1"),
      interaction63: window.localStorage.getItem("fabriclab.rdma.operations-v2.interaction.6.3"),
      unrelated: window.localStorage.getItem("fabriclab.unrelated-user-preference"),
    }));
    expect(ownership).toEqual({ prediction: null, quiz: null, interaction: null, interaction63: null, unrelated: "preserve" });
    await expect(page.getByTestId("guided-lesson-write")).toHaveAttribute("data-hydrated", "true");

    await advance(page, 7);
    await page.getByTestId("write-evidence-review-option-0").click();
    await page.getByTestId("write-evidence-review-check").click();
    await expect(page.getByTestId("write-evidence-review-feedback")).toHaveAttribute("data-correct", "false");
    await page.getByTestId("write-evidence-review-retry").click();
    await expect(page.getByTestId("write-evidence-review-feedback")).toHaveCount(0);
    await page.getByTestId("write-evidence-review-option-1").click();
    await page.getByTestId("write-evidence-review-check").click();
    await expect(page.getByTestId("write-evidence-review-feedback")).toHaveAttribute("data-correct", "true");

    await page.evaluate(() => {
      const allLessons = ["moving-data", "why-rdma", "memory", "queues", "send-receive", "write", "read", "packets"];
      window.localStorage.setItem("fabriclab.rdma.curriculum.completed.v3", JSON.stringify(allLessons));
      window.localStorage.setItem("fabriclab.rdma.curriculum.finished", "true");
      window.localStorage.setItem("fabriclab.rdma.operations-v2.6.6.prediction", JSON.stringify({ prediction: "No", skipped: false, resultRevealed: true, revision: "operations-v2-prediction-r1" }));
      window.localStorage.setItem("fabriclab.unrelated-user-preference", "preserve");
    });
    await page.goto("/practical/rdma", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("rdma-curriculum-complete")).toBeVisible();
    await page.getByRole("button", { name: /Start the practical again/i }).click();
    const restarted = await page.evaluate(() => ({
      prediction: window.localStorage.getItem("fabriclab.rdma.operations-v2.6.6.prediction"),
      quiz: window.localStorage.getItem("fabriclab.rdma.operations-v2.quiz.write-evidence-review"),
      interaction: window.localStorage.getItem("fabriclab.rdma.operations-v2.interaction.6.8"),
      lesson: window.localStorage.getItem("fabriclab.rdma.lesson.write.state.v2"),
      completed: window.localStorage.getItem("fabriclab.rdma.curriculum.completed.v3"),
      unrelated: window.localStorage.getItem("fabriclab.unrelated-user-preference"),
    }));
    expect(restarted).toEqual({ prediction: null, quiz: null, interaction: null, lesson: null, completed: "[]", unrelated: "preserve" });
    await expect(page.getByTestId("guided-lesson-moving-data")).toBeVisible();
  });

  test("READ request/response directions, lengths, completion ownership and comparison table are exact", async ({ page }) => {
    await openOperations(page, "read");
    await advance(page, 2);

    await page.getByTestId("describe-read-local-destination").click();
    await expect(page.getByTestId("read-source-line-sge")).toContainText("SGE");
    await expect(page.getByTestId("visual-7-3")).toContainText(/local destination SGE construction/i);
    await expect(page.getByTestId("visual-7-3")).toContainText(/have not yet been attached to the Work Request/i);
    await page.getByTestId("construct-read").click();
    await expect(page.getByTestId("read-source-line-wr-construction")).toContainText("SendWR");
    await expect(page.getByTestId("read-source-line-remote-attachment")).toHaveCount(0);
    await expect(page.getByTestId("read-construct-explanation")).toContainText(/where the returned bytes should be placed/i);
    await expect(page.getByTestId("read-construct-explanation")).toContainText(/No application payload is being sent/i);
    await expect(page.getByTestId("actual-read-wr")).toHaveAttribute("data-representation", "source-derived");
    await expect(page.getByTestId("actual-read-wr")).toHaveAttribute("data-remote-fields", "not-attached");
    await expect(page.getByTestId("actual-read-wr")).not.toContainText("remote addr:");
    await expect(page.getByTestId("actual-read-wr")).not.toContainText("RKEY:");
    await expect(page.getByTestId("read-wr-lifecycle")).toHaveAttribute("data-stage", "constructed");
    await expect(page.getByTestId("visual-7-3")).toContainText("no posted READ WR");
    await page.getByTestId("attach-read-remote-source").click();
    await expect(page.getByTestId("read-source-line-remote-attachment")).toContainText("set_wr_rdma");
    await expect(page.getByTestId("read-attach-explanation")).toContainText(/authorized source memory at B/i);
    await expect(page.getByTestId("actual-read-wr")).toHaveAttribute("data-remote-fields", "included");
    await expect(page.getByTestId("actual-read-wr")).toContainText("remote addr:");
    await expect(page.getByTestId("actual-read-wr")).toContainText("RKEY:");
    await expect(page.getByTestId("visual-7-3")).toContainText(/now part of A's READ Work Request/i);
    await expect(page.getByTestId("visual-7-3")).not.toContainText("The application has submitted the instruction");
    await page.getByTestId("submit-read").click();
    await expect(page.getByTestId("read-source-line-post-send")).toContainText("post_send");
    await expect(page.getByTestId("read-submit-explanation")).toContainText(/data will travel from B back to A/i);
    await expect(page.getByTestId("read-wr-lifecycle")).toHaveAttribute("data-stage", "posted");
    await expect(page.getByTestId("actual-read-wr")).toHaveAttribute("data-representation", "recorded");
    await expect(page.getByTestId("visual-7-3")).toContainText("The application has submitted the instruction");
    await expect(page.getByTestId("visual-7-3")).toContainText(/submitted READ references this registered source/i);

    await advance(page, 1);
    await page.getByTestId("inspect-read-request").click();
    const request = page.locator('[data-testid="read-request-inspector"][data-packet-id="d:packet:3"]');
    await expect(request).toContainText("RDMA READ Request");
    await expect(request).toContainText("Application payload bytes");
    await expect(request).toContainText("0");
    await expect(request).toContainText("DMA length");
    await expect(request).toContainText("46");
    await expect(page.getByTestId("read-request-range")).toContainText("payload bytes 0");
    await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-direction", "a-to-b");
    await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-kind", "request");
    await page.getByTestId("check-read-source-access").click();
    await expect(page.getByTestId("read-access-validation")).toHaveAttribute("data-qpn-match", "true");
    await expect(page.getByTestId("read-access-validation")).toHaveAttribute("data-key-match", "true");
    await expect(page.getByTestId("read-access-validation")).toHaveAttribute("data-range-fits", "true");
    await expect(page.getByTestId("read-access-validation-checks")).toContainText(/remote-read permission/i);

    await advance(page, 1);
    await page.getByTestId("inspect-read-response").click();
    const response = page.locator('[data-testid="read-response-inspector"][data-packet-id="d:packet:4"]');
    await expect(response).toContainText("RDMA READ response Only");
    await expect(response).toContainText("46");
    await expect(response).not.toContainText("Remote virtual address");
    await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-direction", "b-to-a");
    await expect(page.getByTestId("focus-transfer")).toHaveAttribute("data-kind", "response");
    await page.getByTestId("place-returned-bytes").click();
    await expect(page.getByTestId("read-response-prefix-comparison")).toHaveAttribute("data-equal", "true");
    await expect(page.getByTestId("read-response-prefix-comparison")).toContainText("first 46 bytes");

    await advance(page, 1);
    await page.getByTestId("poll-reader-cq").click();
    await expect(page.getByTestId("read-a-completion")).toContainText("cqe:d:hosta:exp-d-reader:6");
    await expect(page.getByTestId("inspect-source-cq")).toBeDisabled();
    await page.getByTestId("inspect-verified-reader-memory").click();
    await expect(page.getByTestId("read-result-exact-comparison")).toHaveAttribute("data-equal", "true");
    await page.getByTestId("signal-read-done").click();
    await expect(page.getByTestId("visual-7-6")).toContainText("d:hostb:exp-d-source:5");
    await page.getByTestId("inspect-source-cq").click();
    await expect(page.getByTestId("read-source-zero-poll")).toContainText("d:hostb:exp-d-source:6");
    await expect(page.getByTestId("read-source-zero-poll")).toContainText("npolled=0");
    await expect(page.getByTestId("visual-7-6")).not.toContainText(/B application SendWR submitted/i);

    await advance(page, 1);
    const table = page.getByTestId("three-operation-authored-table");
    await expect(table).toContainText("B, posted receive");
    await expect(table).toContainText("A, remote address and RKEY");
    await expect(table).toContainText("A, local SGE");
    await expect(table).toContainText("A SEND; B RECEIVE");
    await expect(table).toContainText("A WRITE");
    await expect(table).toContainText("A READ");
    await expect(page.getByTestId("read-direction-review-answer-hidden")).toBeVisible();
    await page.getByTestId("read-direction-review-option-1").click();
    await page.getByTestId("read-direction-review-check").click();
    await expect(page.getByTestId("read-direction-review-feedback")).toHaveAttribute("data-correct", "true");
    await expect(page.getByTestId("read-direction-review-feedback")).toContainText(/B back to A/i);
  });

  test("packet audit lengths, code correlation and all three investigations use scoped genuine evidence", async ({ page }) => {
    await openOperations(page, "packets");
    await advance(page, 3);

    const breakdown = page.getByTestId("packet-length-breakdown");
    await expect(breakdown).toHaveAttribute("data-packet-id", "b:packet:3");
    await expect(breakdown).toHaveAttribute("data-app-payload", "50");
    await expect(breakdown).toHaveAttribute("data-padding", "2");
    await expect(breakdown).toHaveAttribute("data-frame-length", "110");
    await expect(breakdown).toHaveAttribute("data-transfer-length", "50");
    await expect(page.getByTestId("packet-structural-strip")).toHaveAttribute("data-structure", "Ethernet/IPv4/UDP>BTH>payload 50>padding 2>ICRC");
    await expect(page.getByTestId("packet-structure-evidence-note")).toContainText("Protocol structure; individual fields are not decoded");
    await expect(page.getByTestId("length-packet-send-ack")).toHaveText("SEND ACK");
    await expect(page.getByTestId("length-packet-write-ack")).toHaveText("WRITE ACK");
    await page.getByTestId("length-packet-send-ack").click();
    await expect(breakdown).toHaveAttribute("data-packet-id", "b:packet:4");
    await expect(page.getByTestId("packet-structural-strip")).toHaveAttribute("data-structure", "Ethernet/IPv4/UDP>BTH>AETH>ICRC");
    await expect(page.getByTestId("packet-length-breakdown")).toContainText("selected packet opcode Acknowledge");
    await page.getByTestId("length-packet-write-ack").click();
    await expect(breakdown).toHaveAttribute("data-packet-id", "c:packet:8");
    await expect(page.getByTestId("packet-structural-strip")).toHaveAttribute("data-structure", "Ethernet/IPv4/UDP>BTH>AETH>ICRC");
    await expect(page.getByTestId("packet-length-breakdown")).toContainText("selected packet opcode Acknowledge");
    await expect(page.getByTestId("packet-length-breakdown")).not.toContainText(/syndrome|MSN/i);
    await page.getByTestId("length-packet-send").click();
    await page.getByTestId("length-packet-write").click();
    await expect(breakdown).toHaveAttribute("data-packet-id", "c:packet:7");
    await expect(breakdown).toHaveAttribute("data-app-payload", "53");
    await expect(breakdown).toHaveAttribute("data-padding", "3");
    await expect(breakdown).toHaveAttribute("data-frame-length", "130");
    await expect(page.getByTestId("packet-structural-strip")).toHaveAttribute("data-structure", "Ethernet/IPv4/UDP>BTH>RETH>payload 53>padding 3>ICRC");
    await page.getByTestId("toggle-payload-padding-view").click();
    await expect(page.getByTestId("visual-8-4")).toContainText("application payload plus transport padding");
    await expect(page.getByTestId("visual-8-4")).toContainText("56 bytes");
    await page.getByTestId("length-packet-read-request").click();
    await expect(breakdown).toHaveAttribute("data-packet-id", "d:packet:3");
    await expect(breakdown).toHaveAttribute("data-app-payload", "0");
    await expect(breakdown).toHaveAttribute("data-padding", "0");
    await expect(breakdown).toHaveAttribute("data-frame-length", "74");
    await expect(breakdown).toHaveAttribute("data-transfer-length", "46");
    await expect(page.getByTestId("read-request-length-distinction")).toContainText("operation transfer length 46");
    await expect(page.getByTestId("packet-structural-strip")).toHaveAttribute("data-structure", "Ethernet/IPv4/UDP>BTH>RETH>ICRC");
    await page.getByTestId("length-packet-read-response").click();
    await expect(breakdown).toHaveAttribute("data-packet-id", "d:packet:4");
    await expect(breakdown).toHaveAttribute("data-app-payload", "46");
    await expect(breakdown).toHaveAttribute("data-padding", "2");
    await expect(breakdown).toHaveAttribute("data-frame-length", "110");
    await expect(page.getByTestId("packet-structural-strip")).toHaveAttribute("data-structure", "Ethernet/IPv4/UDP>BTH>AETH>payload 46>padding 2>ICRC");

    await advance(page, 1);
    await page.getByTestId("multipacket-select-middle").click();
    await expect(page.getByTestId("shared-byte-range-representation")).toHaveAttribute("data-selected-start", "1024");
    await expect(page.getByTestId("shared-byte-range-representation")).toHaveAttribute("data-selected-end", "2047");
    await expect(page.getByTestId("visual-8-5")).toContainText(/three packets do not imply three receive WRs/i);

    await advance(page, 2);
    await page.getByTestId("correlate-remote-key").click();
    await expect(page.getByTestId("selected-code-wire-chain")).toHaveAttribute("data-direct-field", "true");
    await expect(page.getByTestId("selected-code-wire-chain")).toContainText("set_wr_rdma");
    await expect(page.getByTestId("correlation-field-explanation")).toContainText(/RETH RKEY/i);
    await page.getByTestId("correlate-local-address").click();
    await expect(page.getByTestId("selected-code-wire-chain")).toHaveAttribute("data-direct-field", "false");
    await expect(page.getByTestId("correlation-field-explanation")).toContainText(/used by the initiator provider/i);
    await expect(page.getByTestId("correlation-write-wr")).toContainText("wr:c:hosta:exp-c-writer:5");
    await expect(page.getByTestId("complete-write-evidence-chain")).toContainText("Transport response");
    await expect(page.getByTestId("complete-write-evidence-chain")).toContainText("write_done");
    await page.getByTestId("correlate-destination-qpn").click();
    await expect(page.getByTestId("correlation-source-lines")).toContainText("attr.dest_qp_num");
    await expect(page.getByTestId("correlation-field-explanation")).toContainText(/merely log prepared values/i);
    await page.getByTestId("inspect-write-payload-match").click();
    await expect(page.getByTestId("write-payload-target-match")).toHaveAttribute("data-equal", "true");

    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("visual-8-6")).toBeVisible();
    await page.getByTestId("inspect-lab-retry-settings").click();
    await expect(page.getByTestId("visual-8-6")).toContainText("rnr_retry");
    await expect(page.getByTestId("visual-8-6")).toContainText("cq.poll(1)");
    await expect(page.getByTestId("visual-8-6")).toContainText(/separate mechanisms/i);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("visual-8-7")).toBeVisible();

    await advance(page, 1);
    await expect(page.getByTestId("case-a-packet")).toHaveAttribute("data-packet-id", "b:packet:3");
    await expect(page.getByTestId("case-a-receive-wr")).toHaveCount(0);
    await expect(page.getByTestId("case-a-additional-record-quiz")).toContainText("A's destination QPN alone");
    await expect(page.getByTestId("case-a-additional-record-quiz")).toContainText("captured Ethernet destination alone");
    await page.getByTestId("case-a-destination-option-1").click();
    await page.getByTestId("case-a-destination-check").click();
    await expect(page.getByTestId("case-a-destination-feedback")).toHaveAttribute("data-correct", "true");
    await expect(page.getByTestId("reveal-completion-verified-bytes")).toBeDisabled();
    await page.getByTestId("reveal-receive-instruction").click();
    await expect(page.getByTestId("case-a-receive-wr")).toContainText("wr:b:hostb:exp-b-receiver:4");
    await page.getByTestId("reveal-completion-verified-bytes").click();
    await expect(page.getByTestId("visual-8-8")).toContainText("cqe:b:hostb:exp-b-receiver:5");
    await expect(page.getByTestId("visual-8-8")).toContainText("b:memory:hostb:received");
    await expect(page.getByTestId("visual-8-8")).toContainText("b:hostb:exp-b-receiver:7");

    await advance(page, 1);
    await expect(page.getByTestId("case-b-select-write-request")).toContainText("c:packet:7");
    await page.getByTestId("case-b-select-ack").click();
    await expect(page.getByTestId("case-b-selected-packet-note")).toContainText(/reverse ACK/i);
    await expect(page.getByTestId("case-b-selected-packet-inspector")).toHaveAttribute("data-packet-id", "c:packet:8");
    await page.getByTestId("case-b-ack-meaning-option-0").click();
    await expect(page.getByTestId("case-b-ack-meaning-check")).toBeDisabled();
    await page.getByTestId("case-b-ack-meaning-skip").click();
    await expect(page.getByTestId("case-b-ack-meaning-feedback")).toContainText(/Skipping does not record mastery/i);
    await expect(page.getByTestId("reveal-control-and-target-poll")).toBeDisabled();
    await page.getByTestId("reveal-writer-completion").click();
    await expect(page.getByTestId("case-b-writer-completion")).toContainText("cqe:c:hosta:exp-c-writer:6");
    await page.getByTestId("reveal-control-and-target-poll").click();
    await expect(page.getByTestId("visual-8-9")).toContainText("c:hostb:exp-c-target:5");
    await expect(page.getByTestId("visual-8-9")).toContainText("c:hostb:exp-c-target:6");
    await expect(page.getByTestId("visual-8-9")).toContainText("cq.poll(1)");
    await page.getByTestId("reveal-target-memory-evidence").click();
    await expect(page.getByTestId("case-b-target-memory")).toContainText("c:memory:hostb:after");

    await advance(page, 1);
    await expect(page.getByTestId("case-c-response")).toHaveAttribute("data-packet-id", "d:packet:4");
    await expect(page.getByTestId("inspect-originating-read-work")).toBeDisabled();
    await page.getByTestId("find-earlier-read-request").click();
    await expect(page.getByTestId("case-c-earlier-request")).toContainText("d:packet:3");
    await page.getByTestId("inspect-originating-read-work").click();
    await expect(page.getByTestId("case-c-originating-wr")).toContainText("wr:d:hosta:exp-d-reader:5");
    await expect(page.getByTestId("visual-8-10")).toContainText(/No new B application SEND WR/i);
    await page.getByTestId("inspect-read-data-completion").click();
    await expect(page.getByTestId("case-c-reader-completion")).toContainText("cqe:d:hosta:exp-d-reader:6");
    await expect(page.getByTestId("case-c-read-result")).toContainText("d:memory:hosta:read-result");
    await expect(page.getByTestId("case-c-source-before")).toContainText("d:memory:hostb:before");
    await expect(page.getByTestId("visual-8-10")).toContainText("d:hostb:exp-d-source:6");

    await advance(page, 1);
    await expect(page.getByTestId("ai-fabric-bridge")).toBeVisible();
    await expect(page.getByTestId("ai-control-payload-paths")).toContainText(/CPU\/control path/i);
    await expect(page.getByTestId("ai-control-payload-paths")).toContainText(/Memory payload path/i);
    await expect(page.getByTestId("conceptual-fabric-path")).toContainText("Leaf A");
    await expect(page.getByTestId("conceptual-fabric-path")).toContainText("Spine");
    await page.getByTestId("inspect-fabric-congestion").click();
    await expect(page.getByTestId("fabric-congestion-mechanism")).toContainText(/ECN marking is an IP congestion indication/i);
    await expect(page.getByTestId("fabric-congestion-mechanism")).toContainText(/PFC is a distinct hop-by-hop priority pause/i);
    await page.getByTestId("inspect-gpu-memory-path").click();
    await expect(page.getByTestId("ai-memory-mode-note")).toContainText(/does not mean all GPU memory/i);
    await expect(page.getByTestId("ai-troubleshooting-chapter-links").getByRole("link", { name: /Chapter 16/i })).toHaveAttribute("href", "/learn/ch16-gpu-compute-network-packet-anatomy");
    await expect(page.getByTestId("ai-troubleshooting-chapter-links").getByRole("link", { name: /Chapter 5/i })).toHaveAttribute("href", "/learn/ch5-pfc-ecn-congestion");
    await expect(page.getByTestId("ai-bridge-scope-label")).toContainText(/no measured NCCL\/GPU experiment/i);
  });
});
