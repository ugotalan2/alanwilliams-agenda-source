package com.alanwilliams.agenda.structure;

import com.alanwilliams.agenda.organization.Organization;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "organization_position")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrganizationPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false)
    private Boolean active;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public OrganizationPosition(
            Organization organization,
            String name
    ) {
        Instant now = Instant.now();

        this.organization = organization;
        this.name = name.trim();
        this.active = true;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void rename(String name) {
        this.name = name.trim();
        this.updatedAt = Instant.now();
    }

    public void deactivate() {
        this.active = false;
        this.updatedAt = Instant.now();
    }
}