package com.alanwilliams.agenda.membership;

import com.alanwilliams.agenda.organization.Organization;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "organization_membership")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrganizationMembership {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organization_id", nullable = false)
  private Organization organization;

  @Column(name = "person_id")
  private Long personId;

  @Column(name = "display_name", nullable = false, length = 150)
  private String displayName;

  @Column(name = "provisional_email", length = 255)
  private String provisionalEmail;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private MembershipStatus status;

  @Enumerated(EnumType.STRING)
  @Column(name = "organization_role", nullable = false, length = 20)
  private OrganizationRole organizationRole;

  @Column(name = "start_date")
  private LocalDate startDate;

  @Column(name = "end_date")
  private LocalDate endDate;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static OrganizationMembership activeOwner(
      Organization organization, Long personId, String displayName) {
    OrganizationMembership membership = new OrganizationMembership();

    Instant now = Instant.now();

    membership.organization = organization;
    membership.personId = personId;
    membership.displayName = displayName.trim();
    membership.status = MembershipStatus.ACTIVE;
    membership.organizationRole = OrganizationRole.OWNER;
    membership.startDate = LocalDate.now();
    membership.createdAt = now;
    membership.updatedAt = now;

    return membership;
  }

  public static OrganizationMembership pending(
      Organization organization,
      String displayName,
      String provisionalEmail,
      OrganizationRole organizationRole) {
    OrganizationMembership membership = new OrganizationMembership();

    Instant now = Instant.now();

    membership.organization = organization;
    membership.displayName = displayName.trim();
    membership.provisionalEmail = provisionalEmail.trim().toLowerCase();
    membership.status = MembershipStatus.PENDING;
    membership.organizationRole = organizationRole;
    membership.createdAt = now;
    membership.updatedAt = now;

    return membership;
  }

  public void activate(Long personId) {
    this.personId = personId;
    this.status = MembershipStatus.ACTIVE;
    this.startDate = LocalDate.now();
    this.endDate = null;
    this.updatedAt = Instant.now();
  }

  public void prepareForReinvite(
      String displayName, String provisionalEmail, OrganizationRole organizationRole) {
    this.personId = null;
    this.displayName = displayName.trim();
    this.provisionalEmail = provisionalEmail.trim().toLowerCase();
    this.status = MembershipStatus.PENDING;
    this.organizationRole = organizationRole;
    this.updatedAt = Instant.now();
  }

  public void changeProvisionalEmail(String provisionalEmail) {
    this.provisionalEmail = provisionalEmail.trim().toLowerCase();
    this.updatedAt = Instant.now();
  }

  public void changeRole(OrganizationRole organizationRole) {
    this.organizationRole = organizationRole;
    this.updatedAt = Instant.now();
  }

  public void rename(String displayName) {
    this.displayName = displayName.trim();
    this.updatedAt = Instant.now();
  }

  public void deactivate() {
    this.status = MembershipStatus.INACTIVE;
    this.endDate = LocalDate.now();
    this.updatedAt = Instant.now();
  }
}
