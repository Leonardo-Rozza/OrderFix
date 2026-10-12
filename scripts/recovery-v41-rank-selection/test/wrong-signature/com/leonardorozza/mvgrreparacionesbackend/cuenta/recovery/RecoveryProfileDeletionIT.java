package com.leonardorozza.mvgrreparacionesbackend.cuenta.recovery;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** SYNTHETIC ONLY: declaration matching; no database, runtime, or original body. */
@Timeout(120)
class RecoveryProfileDeletionIT {
    static final boolean SYNTHETIC_ONLY = true;
    static final List<String> CALLBACKS = new ArrayList<>();
    static { System.setProperty("v41.rank.synthetic.initialized", "true"); }

    @ParameterizedTest(name = "V41 recovery order locale={0}, restored={1}, drift={2}")
    @CsvSource({"C,false,REORDER", "C,true,REORDER", "en_US.utf8,false,REORDER", "en_US.utf8,true,REORDER",
            "C,false,V41_NOT_LATEST", "C,true,V41_NOT_LATEST", "en_US.utf8,false,V41_NOT_LATEST", "en_US.utf8,true,V41_NOT_LATEST",
            "C,false,OLDER_TAIL", "C,true,OLDER_TAIL", "en_US.utf8,false,OLDER_TAIL", "en_US.utf8,true,OLDER_TAIL"})
    void v41RecoveryRejectsRankOnlyHistoryDrift(String locale, boolean logicalRestore, CharSequence change) throws Exception {
        CALLBACKS.add(locale + "," + logicalRestore + "," + change);
    }
}
