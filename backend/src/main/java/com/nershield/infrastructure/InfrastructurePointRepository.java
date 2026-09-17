package com.nershield.infrastructure;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InfrastructurePointRepository extends JpaRepository<InfrastructurePointEntity, String> {

    List<InfrastructurePointEntity> findByKind(String kind);

    List<InfrastructurePointEntity> findByKindNot(String kind);
}
