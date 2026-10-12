package com.leonardorozza.mvgrreparacionesbackend.cuenta.recovery;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.platform.engine.DiscoverySelector;
import org.junit.platform.engine.discovery.DiscoverySelectors;

/** Fixed original V41 rank-only history method selection, not a generic selector API. */
public final class V41RankIterationSelection {
    public static final String CLASS =
            "com.leonardorozza.mvgrreparacionesbackend.cuenta.recovery.RecoveryProfileDeletionIT";
    public static final String METHOD = "v41RecoveryRejectsRankOnlyHistoryDrift";
    public static final String PARAMETERS = "java.lang.String, boolean, java.lang.String";
    public static final String NAME = "V41 recovery order locale={0}, restored={1}, drift={2}";
    private static final String[] ROWS = {
            "C,false,REORDER", "C,true,REORDER", "en_US.utf8,false,REORDER", "en_US.utf8,true,REORDER",
            "C,false,V41_NOT_LATEST", "C,true,V41_NOT_LATEST", "en_US.utf8,false,V41_NOT_LATEST", "en_US.utf8,true,V41_NOT_LATEST",
            "C,false,OLDER_TAIL", "C,true,OLDER_TAIL", "en_US.utf8,false,OLDER_TAIL", "en_US.utf8,true,OLDER_TAIL"};

    private V41RankIterationSelection() {}

    public static int parseIndex(String raw) {
        if (raw == null || !raw.matches("(?:[0-9]|1[01])")) {
            throw new IllegalArgumentException("Expected one canonical V41 iteration index from 0 through 11");
        }
        return Integer.parseInt(raw);
    }

    public static DiscoverySelector select(String raw) throws ReflectiveOperationException {
        int index = parseIndex(raw);
        Class<?> original = Class.forName(CLASS, false, V41RankIterationSelection.class.getClassLoader());
        verifyDeclaration(original);
        // Keep the complete original declaration while selecting exactly one original ordinal.
        return DiscoverySelectors.selectIteration(
                DiscoverySelectors.selectMethod(CLASS, METHOD, PARAMETERS), index);
    }

    public static void verifyDeclaration(Class<?> original) throws ReflectiveOperationException {
        require(original.getName().equals(CLASS), "Unexpected original class");
        Method method = original.getDeclaredMethod(METHOD, String.class, boolean.class, String.class);
        require(method.getReturnType() == void.class, "Unexpected return type");
        require(method.getDeclaredAnnotations().length == 2, "Unexpected method annotations");
        ParameterizedTest parameterized = method.getAnnotation(ParameterizedTest.class);
        CsvSource csv = method.getAnnotation(CsvSource.class);
        require(parameterized != null && NAME.equals(parameterized.name()), "Unexpected display-name pattern");
        require(csv != null && Arrays.equals(ROWS, csv.value()), "Unexpected ordered original CSV rows");
        for (Method member : CsvSource.class.getDeclaredMethods()) {
            if (!member.getName().equals("value")) {
                require(Objects.deepEquals(member.invoke(csv), member.getDefaultValue()),
                        "Non-default original CSV option: " + member.getName());
            }
        }
        for (Method member : ParameterizedTest.class.getDeclaredMethods()) {
            if (!member.getName().equals("name")) {
                require(Objects.deepEquals(member.invoke(parameterized), member.getDefaultValue()),
                        "Non-default original parameterized option: " + member.getName());
            }
        }
        Timeout timeout = original.getDeclaredAnnotation(Timeout.class);
        require(timeout != null && timeout.value() == 120 && timeout.unit() == TimeUnit.SECONDS
                && timeout.threadMode() == Timeout.ThreadMode.INFERRED, "Unexpected original class timeout");
        require(method.getAnnotation(Timeout.class) == null, "Unexpected method timeout override");
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalArgumentException(message);
        }
    }
}
