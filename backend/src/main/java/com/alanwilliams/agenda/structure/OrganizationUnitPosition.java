package com.alanwilliams.agenda.structure;

import com.alanwilliams.agenda.organization.Organization;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "organization_unit_position")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrganizationUnitPosition {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organization_id", nullable = false)
  private Organization organization;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "organization_unit_id")
  private OrganizationUnit organizationUnit;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organization_position_id", nullable = false)
  private OrganizationPosition organizationPosition;

  @Column(nullable = false)
  private Boolean active;

  @Column(name = "sort_order", nullable = false)
  private Integer sortOrder;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public OrganizationUnitPosition(
      Organization organization,
      OrganizationUnit organizationUnit,
      OrganizationPosition organizationPosition,
      Integer sortOrder) {
    Instant now = Instant.now();

    this.organization = organization;
    this.organizationUnit = organizationUnit;
    this.organizationPosition = organizationPosition;
    this.active = true;
    this.sortOrder = sortOrder;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void moveToUnit(OrganizationUnit organizationUnit, Integer sortOrder) {
    this.organizationUnit = organizationUnit;
    this.sortOrder = sortOrder;
    this.updatedAt = Instant.now();
  }

  public void reorder(Integer sortOrder) {
    this.sortOrder = sortOrder;
    this.updatedAt = Instant.now();
  }

  public void deactivate() {
    this.active = false;
    this.updatedAt = Instant.now();
  }
}
