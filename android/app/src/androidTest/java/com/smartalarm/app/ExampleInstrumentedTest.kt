package com.smartalarm.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Instrumented test placeholder for the foundation milestone. Runs on a real device/emulator
 * (unlike ExampleUnitTest, which runs on the local JVM), proving the app installs and its
 * application id/context resolve correctly under the real Android framework.
 */
@RunWith(AndroidJUnit4::class)
class ExampleInstrumentedTest {

    @Test
    fun applicationId_isSmartAlarmDebugPackage() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("com.smartalarm.app.debug", appContext.packageName)
    }
}
