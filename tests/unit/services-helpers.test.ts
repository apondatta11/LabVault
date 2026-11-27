import { describe, expect, it } from "vitest";
import { ConsoleNotificationDispatcher } from "@/lib/services/notification-service";
import { UniversityStudentVerifier } from "@/lib/services/student-verifier";

describe("UniversityStudentVerifier & ConsoleNotificationDispatcher", () => {
  it("validates institutional student IDs and emails", async () => {
    const verifier = new UniversityStudentVerifier();

    const ok = await verifier.verify("2103097", "2103097@student.ruet.ac.bd");
    expect(ok.valid).toBe(true);

    const badId = await verifier.verify("12", "2103097@student.ruet.ac.bd");
    expect(badId.valid).toBe(false);

    const badEmail = await verifier.verify("2103097", "not-an-email");
    expect(badEmail.valid).toBe(false);
  });

  it("records dispatched notifications in memory history", async () => {
    const dispatcher = new ConsoleNotificationDispatcher();
    await dispatcher.send(
      "2103097@student.ruet.ac.bd",
      "Checkout Confirmed",
      "STM32 Nucleo checked out"
    );
    expect(dispatcher.history).toHaveLength(1);
    expect(dispatcher.history[0].to).toBe("2103097@student.ruet.ac.bd");
  });
});
