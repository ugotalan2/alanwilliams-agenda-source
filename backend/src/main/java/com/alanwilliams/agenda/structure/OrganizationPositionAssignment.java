package com.alanwilliams.agenda.structure;

import com.alanwilliams.agenda.membership.OrganizationMembership;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "organization_position_assignment")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrganizationPositionAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "organization_unit_position_id",
            nullable = false
    )
    private OrganizationUnitPosition organizationUnitPosition;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "organization_membership_id",
            nullable = false
    )
    private OrganizationMembership organizationMembership;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public OrganizationPositionAssignment(
            OrganizationUnitPosition organizationUnitPosition,
            OrganizationMembership organizationMembership,
            LocalDate startDate
    ) {
        Instant now = Instant.now();

        this.organizationUnitPosition = organizationUnitPosition;
        this.organizationMembership = organizationMembership;
        this.startDate =
                startDate == null ? LocalDate.now() : startDate;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void end(LocalDate endDate) {
        this.endDate =
                endDate == null ? LocalDate.now() : endDate;
        this.updatedAt = Instant.now();
    }
}