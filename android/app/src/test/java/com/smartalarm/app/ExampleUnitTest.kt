package com.smartalarm.app

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Local (JVM) unit test placeholder for the foundation milestone.
 *
 * This exists to prove `./gradlew test` runs a real JUnit test against this module with the
 * configured Kotlin/JVM toolchain. Phase 1 will replace/extend this file with real tests for
 * [com.smartalarm.app] domain logic (occurrence-time calculation, recurrence, snooze math) that
 * do not depend on the Android framework, matching the pattern already validated in the
 * TypeScript simulator's alarmScheduler.ts.
 */
class ExampleUnitTest {

    @Test
    fun jvmUnitTestInfrastructure_isWorking() {
        assertEquals(4, 2 + 2)
    }
}
