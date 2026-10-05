package com.alanwilliams.agenda.structure;

import com.alanwilliams.agenda.organization.Organization;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "organization_unit")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrganizationUnit {

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

  @Column(name = "sort_order", nullable = false)
  private Integer sortOrder;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public OrganizationUnit(Organization organization, String name, Integer sortOrder) {
    Instant now = Instant.now();

    this.organization = organization;
    this.name = name.trim();
    this.active = true;
    this.sortOrder = sortOrder;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void rename(String name) {
    this.name = name.trim();
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
