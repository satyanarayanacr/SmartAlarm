import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.kapt)
}

android {
    namespace = "com.smartalarm.app"
    // compileSdk 37 is required by the resolved Compose 1.12.0 libraries (AAR metadata check).
    // targetSdk is intentionally kept at 36 below - compileSdk may be higher than targetSdk;
    // it only controls which APIs are available at compile time, not runtime behavior opt-in.
    compileSdk = 37

    defaultConfig {
        applicationId = "com.smartalarm.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "0.2.0-phase1"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            // Distinct application ID suffix so a debug build can be installed side-by-side
            // with a future release build on the same device.
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            isReturnDefaultValues = true
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_17
    }
}

// Room schema export location - required so future phases can add non-destructive migrations
// instead of falling back to destructive table drops when the schema changes. Room's annotation
// processor runs via kapt (see the kotlin-kapt plugin above and the kapt(...) dependency below)
// rather than KSP - see the long comment on `kotlin` in gradle/libs.versions.toml for why.
kapt {
    arguments {
        arg("room.schemaLocation", "$projectDir/schemas")
        arg("room.incremental", "true")
    }
}

// Room 2.8.4 bundles a kotlin-metadata-jvm that only reads Kotlin metadata up to version 2.3.0,
// but our Kotlin 2.4.10 compiler stamps classes with metadata version 2.4.0 - kapt's annotation
// processing round fails reading Room's own generated stubs with:
//   "Provided Metadata instance has version 2.4.0, while maximum supported version is 2.3.0."
// Forcing the newer, Kotlin-2.4.10-published kotlin-metadata-jvm onto every configuration
// (including the kapt annotation-processor classpath) fixes the read. See the long comment on
// `room` in gradle/libs.versions.toml for the full explanation and evidence.
configurations.all {
    resolutionStrategy {
        force(libs.kotlin.metadata.jvm)
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.navigation.compose)

    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    kapt(libs.androidx.room.compiler)

    implementation(libs.kotlinx.coroutines.android)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.androidx.arch.core.testing)
    testImplementation(libs.androidx.room.testing)

    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)

    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}
